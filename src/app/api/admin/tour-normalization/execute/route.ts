import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i++; }
    else if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += char; }
  }
  values.push(current.trim());
  return values;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h =>
    h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
    return row;
  });
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

function parseDate(val: string): string | null {
  if (!val) return null;
  val = val.trim();
  const ymd = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const year = parseInt(y);
    const mNum = parseInt(m);
    const dNum = parseInt(d);
    if (year < 1900 || year > 2100) return null;
    if (mNum > 12 && dNum <= 12) return `${y}-${d.padStart(2,'0')}-${m.padStart(2,'0')}`;
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) return val;
    return null;
  }
  const mdy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const [, mStr, dStr, yStr] = mdy;
    let year = parseInt(yStr);
    if (yStr.length === 2) year = year < 50 ? 2000 + year : 1900 + year;
    if (year < 1900) {
      if (yStr.length === 4 && yStr.startsWith('10')) year = 2000 + parseInt(yStr.substring(2));
      else return null;
    }
    if (year > 2100) return null;
    if (parseInt(mStr) < 1 || parseInt(mStr) > 12 || parseInt(dStr) < 1 || parseInt(dStr) > 31) return null;
    return `${year}-${mStr.padStart(2,'0')}-${dStr.padStart(2,'0')}`;
  }
  const full = val.match(/^[A-Za-z]+,\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (full) {
    const monthMap: Record<string, number> = {
      'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,
      'july':7,'august':8,'september':9,'october':10,'november':11,'december':12
    };
    const month = monthMap[full[1].toLowerCase()];
    if (!month) return null;
    const year = parseInt(full[3]);
    if (year < 1900 || year > 2100) return null;
    return `${year}-${month.toString().padStart(2,'0')}-${full[2].padStart(2,'0')}`;
  }
  return null;
}

function normalizeStatus(val: string): string {
  const map: Record<string, string> = {
    'pendiente': 'pending', 'pending': 'pending',
    'confirmado': 'confirmed', 'confirmed': 'confirmed', 'confirmada': 'confirmed',
    'realizado': 'completed', 'completado': 'completed', 'completed': 'completed',
    'cancelado': 'cancelled', 'cancelled': 'cancelled',
    'no_show': 'no_show', 'no show': 'no_show',
  };
  return map[val.toLowerCase().trim()] || 'pending';
}

interface GroupDecision {
  groupId: number;
  csvNames: string[];
  action: 'create' | 'map' | 'skip';
  productId?: string;
  name_en?: string;
  name_es?: string;
  vendor_id?: string;
}

/**
 * POST /api/admin/tour-normalization/execute
 * Accepts: multipart/form-data with:
 *   - file: the original CSV
 *   - groups: JSON array of GroupDecision
 *
 * Step 1: create new tour_products for 'create' groups (with vendor_id)
 * Step 2: save tour_name_mappings for future reference
 * Step 3: import all tour_bookings
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const groupsJson = formData.get('groups') as string;
    if (!file || !groupsJson) {
      return NextResponse.json({ error: 'file and groups required' }, { status: 400 });
    }

    const groups: GroupDecision[] = JSON.parse(groupsJson);

    // Step 1: build csvName → productId map
    const csvNameToProductId: Record<string, string> = {};

    for (const group of groups) {
      if (group.action === 'skip' || !group.csvNames?.length) continue;

      let productId: string | null = null;

      if (group.action === 'create' && group.name_en) {
        const res = await query(
          `INSERT INTO tour_products (name_en, name_es, vendor_id)
           VALUES ($1, $2, $3) RETURNING id`,
          [group.name_en, group.name_es || group.name_en, group.vendor_id || null]
        );
        productId = res.rows[0].id;
      } else if (group.action === 'map' && group.productId) {
        productId = group.productId;
      }

      if (!productId) continue;

      for (const csvName of group.csvNames) {
        csvNameToProductId[csvName] = productId;
        try {
          await query(
            `INSERT INTO tour_name_mappings (original_name, confirmed_product_id)
             VALUES ($1, $2) ON CONFLICT (original_name) DO UPDATE SET confirmed_product_id = $2`,
            [csvName, productId]
          );
        } catch {
          // non-fatal if tour_name_mappings doesn't exist yet
        }
      }
    }

    // Step 2: import bookings
    const csvText = await file.text();
    const rows = parseCSV(csvText);

    const result = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const row of rows) {
      const csvName = getField(row,
        'nombre_de_la_actividad', 'product', 'product_name',
        'actividad', 'tour', 'activity', 'nombre_actividad'
      );
      const legacyId = getField(row, 'id', 'row_id', 'id_actividad', '_rownum', 'row_number');
      const dateVal = getField(row, 'date', 'fecha', 'fecha_actividad');
      const date = parseDate(dateVal);
      if (!date) { result.skipped++; continue; }

      const productId = csvNameToProductId[csvName];
      if (!productId) { result.skipped++; continue; }

      const guestName = getField(row, 'guest', 'guest_name', 'huesped', 'nombre_completo');
      const guestLegacyId = getField(row, 'guest_id', 'id_huesped');
      const numGuests = parseInt(getField(row, 'num_guests', 'huespedes', 'pax', 'cantidad_huespedes') || '1') || 1;
      const bookingMode = getField(row, 'booking_mode', 'modo', 'type', 'tipo_reserva') || 'shared';
      const totalPrice = parseFloat(getField(row, 'total_price', 'precio', 'price', 'precio_total') || '0') || null;
      const guestStatus = normalizeStatus(getField(row, 'guest_status', 'estado_huesped', 'estado'));
      const vendorStatus = normalizeStatus(getField(row, 'vendor_status', 'estado_proveedor'));
      const specialRequests = getField(row, 'special_requests', 'solicitudes', 'notes', 'notas') || null;
      const billedDate = parseDate(getField(row, 'billed_date', 'fecha_cobro', 'fecha_factura'));
      const paidDate = parseDate(getField(row, 'paid_date', 'fecha_pago'));

      try {
        await transaction(async (client) => {
          // Find or create guest
          let guestId: string | null = null;
          if (guestLegacyId) {
            const r = await client.query('SELECT id FROM guests WHERE legacy_appsheet_id = $1', [guestLegacyId]);
            if (r.rows.length > 0) guestId = r.rows[0].id;
          }
          if (!guestId && guestName) {
            const r = await client.query('SELECT id FROM guests WHERE full_name = $1 LIMIT 1', [guestName]);
            if (r.rows.length > 0) {
              guestId = r.rows[0].id;
            } else {
              const parts = guestName.trim().split(/\s+/);
              const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
              const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
              const r2 = await client.query(
                `INSERT INTO guests (first_name, last_name, legacy_appsheet_id) VALUES ($1, $2, $3) RETURNING id`,
                [firstName, lastName, guestLegacyId || null]
              );
              guestId = r2.rows[0].id;
            }
          }

          const existing = legacyId
            ? await client.query('SELECT id FROM tour_bookings WHERE legacy_appsheet_id = $1', [legacyId])
            : { rows: [] };

          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE tour_bookings SET guest_id=$1, product_id=$2, num_guests=$3,
               booking_mode=$4, total_price=$5, guest_status=$6, vendor_status=$7,
               special_requests=$8, billed_date=$9, paid_date=$10 WHERE id=$11`,
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
        result.errors.push(`Row "${legacyId}": ${err.message}`);
      }
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
