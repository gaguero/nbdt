import { transaction } from '@/lib/db';

export type AppSheetTable =
  | 'guests'
  | 'vendors'
  | 'transfers'
  | 'special_requests'
  | 'other_hotel_bookings'
  | 'romantic_dinners'
  | 'tour_bookings';

export interface CsvImportResult {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && inQuotes && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h =>
    h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function get(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

function parseDate(val: string): string | null {
  if (!val) return null;
  // Try YYYY-MM-DD (but detect YYYY-DD-MM if middle segment > 12)
  const ymd = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, y, seg2, seg3] = ymd;
    const seg2Num = parseInt(seg2);
    if (seg2Num > 12) {
      // Likely YYYY-DD-MM format, swap
      return `${y}-${seg3}-${seg2}`;
    }
    return val; // Valid YYYY-MM-DD
  }
  // Try DD/MM/YYYY or DD/MM/YY
  const dmY = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmY) {
    const [, d, m, y] = dmY;
    const year = y.length === 2 ? (parseInt(y) < 50 ? `20${y}` : `19${y}`) : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function parseBool(val: string): boolean {
  return ['true', '1', 'yes', 'sí', 'si'].includes(val.toLowerCase());
}

function normalizeStatus(val: string): string {
  if (!val) return 'pending';
  const lower = val.toLowerCase().trim();
  // Map Spanish status values to English
  const statusMap: Record<string, string> = {
    'pendiente': 'pending',
    'pending': 'pending',
    'confirmado': 'confirmed',
    'confirmed': 'confirmed',
    'confirmada': 'confirmed',
    'realizado': 'completed',
    'realizada': 'completed',
    'completado': 'completed',
    'completada': 'completed',
    'completed': 'completed',
    'cancelado': 'cancelled',
    'cancelada': 'cancelled',
    'cancelled': 'cancelled',
    'no_show': 'no_show',
    'no show': 'no_show',
    'noshow': 'no_show',
  };
  return statusMap[lower] || 'pending';
}

// ============================================================================
// GUEST / VENDOR LOOKUP HELPERS
// ============================================================================

async function findOrCreateGuest(
  client: any,
  guestName: string,
  legacyId: string
): Promise<string | null> {
  if (!guestName && !legacyId) return null;

  if (legacyId) {
    const r = await client.query(
      'SELECT id FROM guests WHERE legacy_appsheet_id = $1',
      [legacyId]
    );
    if (r.rows.length > 0) return r.rows[0].id;
  }

  if (guestName) {
    const r = await client.query(
      'SELECT id FROM guests WHERE full_name = $1 LIMIT 1',
      [guestName]
    );
    if (r.rows.length > 0) return r.rows[0].id;

    const parts = guestName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const r2 = await client.query(
      `INSERT INTO guests (first_name, last_name, legacy_appsheet_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [firstName, lastName, legacyId || null]
    );
    return r2.rows[0].id;
  }

  return null;
}

async function findVendor(client: any, vendorName: string, legacyId: string): Promise<string | null> {
  if (legacyId) {
    const r = await client.query('SELECT id FROM vendors WHERE legacy_appsheet_id = $1', [legacyId]);
    if (r.rows.length > 0) return r.rows[0].id;
  }
  if (vendorName) {
    const r = await client.query('SELECT id FROM vendors WHERE name ILIKE $1 LIMIT 1', [vendorName]);
    if (r.rows.length > 0) return r.rows[0].id;
  }
  return null;
}

async function findHotel(client: any, hotelName: string): Promise<string | null> {
  if (!hotelName) return null;
  const r = await client.query(
    'SELECT id FROM partner_hotels WHERE name ILIKE $1 OR code ILIKE $1 LIMIT 1',
    [hotelName]
  );
  return r.rows[0]?.id ?? null;
}

async function findTourProduct(client: any, productName: string): Promise<string | null> {
  if (!productName) return null;
  const r = await client.query(
    'SELECT id FROM tour_products WHERE name_en ILIKE $1 OR name_es ILIKE $1 LIMIT 1',
    [productName]
  );
  return r.rows[0]?.id ?? null;
}

// ============================================================================
// TABLE-SPECIFIC IMPORTERS
// ============================================================================

async function importGuests(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };
  console.log(`[AppSheet] Importing ${rows.length} guests`, { firstRow: rows[0] });

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    try {
      const legacyId = get(row, 'id', 'row_id', 'guest_id', 'id_huesped', '_rownum', 'row_number');
      const fullName = get(row, 'full_name', 'nombre_completo', 'fullname', 'guest_name', 'name');
      const firstName = get(row, 'first_name', 'firstname', 'first', 'nombre');
      const lastName = get(row, 'last_name', 'lastname', 'last', 'apellido');
      const email = get(row, 'email', 'correo', 'email_opera');
      const phone = get(row, 'phone', 'telefono', 'tel', 'mobile', 'telefono_opera');
      const nationality = get(row, 'nationality', 'nacionalidad', 'pais', 'country');
      const notes = get(row, 'notes', 'notas');

      let fn = firstName;
      let ln = lastName;
      if (!fn && !ln && fullName) {
        const parts = fullName.trim().split(/\s+/);
        fn = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
        ln = parts.length > 1 ? parts[parts.length - 1] : '';
      }
      if (!fn) {
        result.errors.push(`Row ${idx + 1}: no first name`);
        console.warn(`[AppSheet] Row ${idx + 1} skipped: no name`, row);
        continue;
      }

      console.log(`[AppSheet] Guest row ${idx + 1}: "${fn} ${ln}", legacy_id="${legacyId}"`);

      await transaction(async (client) => {
        const existing = legacyId
          ? await client.query('SELECT id FROM guests WHERE legacy_appsheet_id = $1', [legacyId])
          : await client.query('SELECT id FROM guests WHERE first_name = $1 AND last_name = $2 LIMIT 1', [fn, ln]);

        if (existing.rows.length > 0) {
          console.log(`[AppSheet] Guest row ${idx + 1}: UPDATE existing guest ${existing.rows[0].id}`);
          await client.query(
            `UPDATE guests SET email = COALESCE(NULLIF($1,''), email),
               phone = COALESCE(NULLIF($2,''), phone),
               nationality = COALESCE(NULLIF($3,''), nationality),
               notes = COALESCE(NULLIF($4,''), notes),
               legacy_appsheet_id = COALESCE(legacy_appsheet_id, NULLIF($5,''))
             WHERE id = $6`,
            [email, phone, nationality, notes, legacyId, existing.rows[0].id]
          );
          result.updated++;
        } else {
          console.log(`[AppSheet] Guest row ${idx + 1}: INSERT new guest "${fn} ${ln}"`);
          await client.query(
            `INSERT INTO guests (first_name, last_name, email, phone, nationality, notes, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [fn, ln, email || null, phone || null, nationality || null, notes || null, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      const errMsg = `Row ${idx + 1}: ${err.message}`;
      result.errors.push(errMsg);
      console.error(`[AppSheet] Guest import error:`, errMsg, { row, error: err });
    }
  }
  console.log(`[AppSheet] Guests import complete:`, result);
  return result;
}

async function importVendors(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };

  for (const row of rows) {
    const legacyId = get(row, 'id', 'row_id', 'vendor_id', '_rownum');
    const name = get(row, 'name', 'nombre');
    if (!name) { result.errors.push('Row skipped — no vendor name'); continue; }

    const email = get(row, 'email', 'correo');
    const phone = get(row, 'phone', 'telefono');
    const type = get(row, 'type', 'tipo') || 'transfer';
    const colorCode = get(row, 'color_code', 'color', 'colour') || '#6B7280';
    const isActive = get(row, 'is_active', 'active', 'activo');
    const notes = get(row, 'notes', 'notas');

    const validTypes = ['transfer', 'tour', 'spa', 'restaurant', 'other'];
    const safeType = validTypes.includes(type) ? type : 'other';

    try {
      await transaction(async (client) => {
        const existing = legacyId
          ? await client.query('SELECT id FROM vendors WHERE legacy_appsheet_id = $1', [legacyId])
          : await client.query('SELECT id FROM vendors WHERE name ILIKE $1 LIMIT 1', [name]);

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE vendors SET name=$1, email=COALESCE(NULLIF($2,''),email),
               phone=COALESCE(NULLIF($3,''),phone), type=$4, color_code=$5,
               is_active=$6, notes=COALESCE(NULLIF($7,''),notes),
               legacy_appsheet_id=COALESCE(legacy_appsheet_id, NULLIF($8,''))
             WHERE id=$9`,
            [name, email, phone, safeType, colorCode,
             isActive ? parseBool(isActive) : true, notes, legacyId, existing.rows[0].id]
          );
          result.updated++;
        } else {
          await client.query(
            `INSERT INTO vendors (name, email, phone, type, color_code, is_active, notes, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [name, email || null, phone || null, safeType, colorCode,
             isActive ? parseBool(isActive) : true, notes || null, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`Vendor "${name}": ${err.message}`);
    }
  }
  return result;
}

async function importTransfers(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };

  for (const row of rows) {
    const legacyId = get(row, 'id', 'row_id', 'transfer_id', 'id_traslado', '_rownum', 'row_number');
    const dateVal = get(row, 'date', 'fecha', 'date_traslado');
    const date = parseDate(dateVal);
    if (!date) { result.errors.push(`Transfer row skipped — invalid date "${dateVal}"`); continue; }

    const guestName = get(row, 'guest', 'guest_name', 'huesped', 'nombre_huesped', 'nombre_completo');
    const guestLegacyId = get(row, 'guest_id', 'huesped_id', 'id_huesped');
    const vendorName = get(row, 'vendor', 'vendor_name', 'proveedor', 'nombre_proveedor');
    const vendorLegacyId = get(row, 'vendor_id', 'proveedor_id', 'id_proveedor');

    try {
      await transaction(async (client) => {
        const guestId = await findOrCreateGuest(client, guestName, guestLegacyId);
        const vendorId = await findVendor(client, vendorName, vendorLegacyId);

        const time = get(row, 'time', 'hora', 'hora_traslado') || null;
        const numPassengers = parseInt(get(row, 'num_passengers', 'pasajeros', 'pax', 'cantidad_pasajeros') || '1') || 1;
        const origin = get(row, 'origin', 'origen', 'lugar_origen') || null;
        const destination = get(row, 'destination', 'destino', 'lugar_destino') || null;
        const guestStatus = normalizeStatus(get(row, 'guest_status', 'estado_huesped', 'estado'));
        const vendorStatus = normalizeStatus(get(row, 'vendor_status', 'estado_proveedor'));
        const billedDate = parseDate(get(row, 'billed_date', 'fecha_cobro', 'fecha_factura'));
        const paidDate = parseDate(get(row, 'paid_date', 'fecha_pago'));
        const notes = get(row, 'notes', 'notas', 'observaciones') || null;

        const existing = legacyId
          ? await client.query('SELECT id FROM transfers WHERE legacy_appsheet_id = $1', [legacyId])
          : null;

        if (existing && existing.rows.length > 0) {
          await client.query(
            `UPDATE transfers SET date=$1, time=$2, guest_id=$3, vendor_id=$4,
               num_passengers=$5, origin=$6, destination=$7, guest_status=$8,
               vendor_status=$9, billed_date=$10, paid_date=$11, notes=$12
             WHERE id=$13`,
            [date, time, guestId, vendorId, numPassengers, origin, destination,
             guestStatus, vendorStatus, billedDate, paidDate, notes, existing.rows[0].id]
          );
          result.updated++;
        } else {
          await client.query(
            `INSERT INTO transfers
               (date, time, guest_id, vendor_id, num_passengers, origin, destination,
                guest_status, vendor_status, billed_date, paid_date, notes, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [date, time, guestId, vendorId, numPassengers, origin, destination,
             guestStatus, vendorStatus, billedDate, paidDate, notes, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`Transfer row "${legacyId}": ${err.message}`);
    }
  }
  return result;
}

async function importSpecialRequests(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };

  for (const row of rows) {
    const legacyId = get(row, 'id', 'row_id', 'id_solicitud', '_rownum', 'row_number');
    const dateVal = get(row, 'date', 'fecha', 'fecha_solicitud');
    const date = parseDate(dateVal);
    if (!date) { result.errors.push(`Request row skipped — invalid date "${dateVal}"`); continue; }

    const requestText = get(row, 'request', 'solicitud', 'description', 'descripcion', 'texto');
    if (!requestText) { result.errors.push(`Request row skipped — no request text`); continue; }

    const guestName = get(row, 'guest', 'guest_name', 'huesped', 'nombre_completo');
    const guestLegacyId = get(row, 'guest_id', 'id_huesped');

    try {
      await transaction(async (client) => {
        const guestId = await findOrCreateGuest(client, guestName, guestLegacyId);

        const time = get(row, 'time', 'hora', 'hora_solicitud') || null;
        const department = get(row, 'department', 'departamento', 'area', 'departamento_solicitud') || null;
        const checkIn = parseDate(get(row, 'check_in', 'checkin', 'entrada', 'fecha_checkin'));
        const checkOut = parseDate(get(row, 'check_out', 'checkout', 'salida', 'fecha_checkout'));
        const notes = get(row, 'notes', 'notas', 'observaciones') || null;

        const existing = legacyId
          ? await client.query('SELECT id FROM special_requests WHERE legacy_appsheet_id = $1', [legacyId])
          : null;

        if (existing && existing.rows.length > 0) {
          await client.query(
            `UPDATE special_requests SET date=$1, time=$2, guest_id=$3, request=$4,
               department=$5, check_in=$6, check_out=$7, notes=$8
             WHERE id=$9`,
            [date, time, guestId, requestText, department, checkIn, checkOut, notes, existing.rows[0].id]
          );
          result.updated++;
        } else {
          await client.query(
            `INSERT INTO special_requests
               (date, time, guest_id, request, department, check_in, check_out, notes, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [date, time, guestId, requestText, department, checkIn, checkOut, notes, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`Request row "${legacyId}": ${err.message}`);
    }
  }
  return result;
}

async function importOtherHotelBookings(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };

  for (const row of rows) {
    const legacyId = get(row, 'id', 'row_id', 'id_reserva_hotel', '_rownum', 'row_number');
    const dateVal = get(row, 'date', 'fecha', 'fecha_reserva');
    const date = parseDate(dateVal);
    if (!date) { result.errors.push(`Hotel booking row skipped — invalid date "${dateVal}"`); continue; }

    const guestName = get(row, 'guest', 'guest_name', 'huesped', 'nombre_completo');
    const guestLegacyId = get(row, 'guest_id', 'id_huesped');
    const hotelName = get(row, 'hotel', 'hotel_name', 'nombre_hotel', 'hotel');

    try {
      await transaction(async (client) => {
        const guestId = await findOrCreateGuest(client, guestName, guestLegacyId);
        const hotelId = await findHotel(client, hotelName);

        const numGuests = parseInt(get(row, 'num_guests', 'huespedes', 'pax', 'cantidad_huespedes') || '1') || 1;
        const checkin = parseDate(get(row, 'checkin', 'check_in', 'entrada', 'fecha_checkin'));
        const checkout = parseDate(get(row, 'checkout', 'check_out', 'salida', 'fecha_checkout'));
        const guestStatus = normalizeStatus(get(row, 'guest_status', 'estado_huesped', 'estado'));
        const vendorStatus = normalizeStatus(get(row, 'vendor_status', 'estado_proveedor'));
        const billedDate = parseDate(get(row, 'billed_date', 'fecha_cobro', 'fecha_factura'));
        const paidDate = parseDate(get(row, 'paid_date', 'fecha_pago'));
        const notes = get(row, 'notes', 'notas', 'observaciones') || null;

        const existing = legacyId
          ? await client.query('SELECT id FROM other_hotel_bookings WHERE legacy_appsheet_id = $1', [legacyId])
          : null;

        if (existing && existing.rows.length > 0) {
          await client.query(
            `UPDATE other_hotel_bookings SET date=$1, guest_id=$2, hotel_id=$3,
               num_guests=$4, checkin=$5, checkout=$6, guest_status=$7,
               vendor_status=$8, billed_date=$9, paid_date=$10, notes=$11
             WHERE id=$12`,
            [date, guestId, hotelId, numGuests, checkin, checkout, guestStatus,
             vendorStatus, billedDate, paidDate, notes, existing.rows[0].id]
          );
          result.updated++;
        } else {
          await client.query(
            `INSERT INTO other_hotel_bookings
               (date, guest_id, hotel_id, num_guests, checkin, checkout,
                guest_status, vendor_status, billed_date, paid_date, notes, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [date, guestId, hotelId, numGuests, checkin, checkout, guestStatus,
             vendorStatus, billedDate, paidDate, notes, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`Hotel booking row "${legacyId}": ${err.message}`);
    }
  }
  return result;
}

async function importRomanticDinners(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };

  for (const row of rows) {
    const legacyId = get(row, 'id', 'row_id', 'id_cena', '_rownum', 'row_number');
    const dateVal = get(row, 'date', 'fecha', 'fecha_cena');
    const date = parseDate(dateVal);
    if (!date) { result.errors.push(`Dinner row skipped — invalid date "${dateVal}"`); continue; }

    const guestName = get(row, 'guest', 'guest_name', 'huesped', 'nombre_completo');
    const guestLegacyId = get(row, 'guest_id', 'id_huesped');

    try {
      await transaction(async (client) => {
        const guestId = await findOrCreateGuest(client, guestName, guestLegacyId);

        const time = get(row, 'time', 'hora', 'hora_cena') || null;
        const numGuests = parseInt(get(row, 'num_guests', 'huespedes', 'comensales', 'cantidad_comensales') || '2') || 2;
        const location = get(row, 'location', 'ubicacion', 'lugar', 'ubicacion_cena') || null;
        const status = normalizeStatus(get(row, 'status', 'estado', 'estado_cena'));
        const notes = get(row, 'notes', 'notas', 'observaciones') || null;

        const existing = legacyId
          ? await client.query('SELECT id FROM romantic_dinners WHERE legacy_appsheet_id = $1', [legacyId])
          : null;

        if (existing && existing.rows.length > 0) {
          await client.query(
            `UPDATE romantic_dinners SET date=$1, time=$2, guest_id=$3,
               num_guests=$4, location=$5, status=$6, notes=$7
             WHERE id=$8`,
            [date, time, guestId, numGuests, location, status, notes, existing.rows[0].id]
          );
          result.updated++;
        } else {
          await client.query(
            `INSERT INTO romantic_dinners (date, time, guest_id, num_guests, location, status, notes, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [date, time, guestId, numGuests, location, status, notes, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`Dinner row "${legacyId}": ${err.message}`);
    }
  }
  return result;
}

async function importTourBookings(rows: Record<string, string>[]): Promise<CsvImportResult> {
  const result: CsvImportResult = { total: rows.length, created: 0, updated: 0, unchanged: 0, errors: [] };

  for (const row of rows) {
    const legacyId = get(row, 'id', 'row_id', 'id_actividad', '_rownum', 'row_number');
    const dateVal = get(row, 'date', 'fecha', 'fecha_actividad');
    const date = parseDate(dateVal);
    if (!date) { result.errors.push(`Tour booking row skipped — invalid date "${dateVal}"`); continue; }

    const guestName = get(row, 'guest', 'guest_name', 'huesped', 'nombre_completo');
    const guestLegacyId = get(row, 'guest_id', 'id_huesped');
    const productName = get(row, 'product', 'product_name', 'actividad', 'tour', 'activity', 'nombre_actividad');

    try {
      await transaction(async (client) => {
        const guestId = await findOrCreateGuest(client, guestName, guestLegacyId);
        const productId = await findTourProduct(client, productName);
        if (!productId && productName) {
          result.errors.push(`Tour booking row "${legacyId}": product "${productName}" not found — skipped`);
          result.unchanged++;
          return;
        }

        const numGuests = parseInt(get(row, 'num_guests', 'huespedes', 'pax', 'cantidad_huespedes') || '1') || 1;
        const bookingMode = get(row, 'booking_mode', 'modo', 'type', 'tipo_reserva') || 'shared';
        const totalPrice = parseFloat(get(row, 'total_price', 'precio', 'price', 'precio_total') || '0') || null;
        const guestStatus = normalizeStatus(get(row, 'guest_status', 'estado_huesped', 'estado'));
        const vendorStatus = normalizeStatus(get(row, 'vendor_status', 'estado_proveedor'));
        const specialRequests = get(row, 'special_requests', 'solicitudes', 'notes', 'notas', 'observaciones') || null;
        const billedDate = parseDate(get(row, 'billed_date', 'fecha_cobro', 'fecha_factura'));
        const paidDate = parseDate(get(row, 'paid_date', 'fecha_pago'));

        const existing = legacyId
          ? await client.query('SELECT id FROM tour_bookings WHERE legacy_appsheet_id = $1', [legacyId])
          : null;

        if (existing && existing.rows.length > 0) {
          await client.query(
            `UPDATE tour_bookings SET guest_id=$1, product_id=$2, num_guests=$3,
               booking_mode=$4, total_price=$5, guest_status=$6, vendor_status=$7,
               special_requests=$8, billed_date=$9, paid_date=$10
             WHERE id=$11`,
            [guestId, productId, numGuests, bookingMode, totalPrice, guestStatus,
             vendorStatus, specialRequests, billedDate, paidDate, existing.rows[0].id]
          );
          result.updated++;
        } else {
          await client.query(
            `INSERT INTO tour_bookings
               (guest_id, product_id, num_guests, booking_mode, total_price,
                guest_status, vendor_status, special_requests, billed_date, paid_date, legacy_appsheet_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [guestId, productId, numGuests, bookingMode, totalPrice, guestStatus,
             vendorStatus, specialRequests, billedDate, paidDate, legacyId || null]
          );
          result.created++;
        }
      });
    } catch (err: any) {
      result.errors.push(`Tour booking row "${legacyId}": ${err.message}`);
    }
  }
  return result;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function importAppSheetCSV(
  csvText: string,
  table: AppSheetTable
): Promise<CsvImportResult> {
  console.log(`[AppSheet] Starting CSV import for table: "${table}"`);
  console.log(`[AppSheet] CSV size: ${csvText.length} bytes, first 500 chars:`, csvText.substring(0, 500));

  const rows = parseCSV(csvText);
  console.log(`[AppSheet] Parsed ${rows.length} rows`, rows.length > 0 ? { firstRow: rows[0] } : {});

  if (rows.length === 0) {
    const result = { total: 0, created: 0, updated: 0, unchanged: 0, errors: ['CSV is empty or has no data rows'] };
    console.warn(`[AppSheet] CSV parse failed:`, result);
    return result;
  }

  switch (table) {
    case 'guests':            return importGuests(rows);
    case 'vendors':           return importVendors(rows);
    case 'transfers':         return importTransfers(rows);
    case 'special_requests':  return importSpecialRequests(rows);
    case 'other_hotel_bookings': return importOtherHotelBookings(rows);
    case 'romantic_dinners':  return importRomanticDinners(rows);
    case 'tour_bookings':     return importTourBookings(rows);
    default:
      return { total: 0, created: 0, updated: 0, unchanged: 0, errors: [`Unknown table: ${table}`] };
  }
}

export const APPSHEET_TABLES: { value: AppSheetTable; label: string }[] = [
  { value: 'guests', label: 'Guests' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'transfers', label: 'Transfers' },
  { value: 'special_requests', label: 'Special Requests' },
  { value: 'other_hotel_bookings', label: 'Other Hotel Bookings' },
  { value: 'romantic_dinners', label: 'Romantic Dinners' },
  { value: 'tour_bookings', label: 'Tour Bookings' },
];
