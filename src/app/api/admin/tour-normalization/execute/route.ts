import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((header) =>
    header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (vals[index] ?? '').trim();
    });
    return row;
  });
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function normalizeLegacyId(raw: string): string {
  return (raw || '').trim();
}

function buildCompositeKey(name: string, legacyVendorId: string): string {
  const normalizedVendorId = normalizeLegacyId(legacyVendorId);
  return `${name}|||${normalizedVendorId || 'NO_VENDOR'}`;
}

function parseTime(val: string): string | null {
  if (!val) return null;
  const m = val.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hour = parseInt(m[1]);
  const minute = parseInt(m[2]);
  if (hour > 23 || minute > 59) return null;
  const second = m[3] ?? '00';
  return `${hour.toString().padStart(2, '0')}:${m[2]}:${second}`;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();

  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const [, year, m, d] = ymd;
    const yearNum = parseInt(year);
    const mNum = parseInt(m);
    const dNum = parseInt(d);
    if (yearNum < 1900 || yearNum > 2100) return null;
    if (mNum > 12 && dNum <= 12) return `${year}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) return trimmed;
    return null;
  }

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
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
    return `${year}-${mStr.padStart(2, '0')}-${dStr.padStart(2, '0')}`;
  }

  const full = trimmed.match(/^[A-Za-z]+,\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (full) {
    const monthMap: Record<string, number> = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
    };
    const month = monthMap[full[1].toLowerCase()];
    if (!month) return null;
    const year = parseInt(full[3]);
    if (year < 1900 || year > 2100) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${full[2].padStart(2, '0')}`;
  }

  return null;
}

function normalizeStatus(val: string): string {
  const map: Record<string, string> = {
    pendiente: 'pending',
    pending: 'pending',
    confirmado: 'confirmed',
    confirmed: 'confirmed',
    confirmada: 'confirmed',
    realizado: 'completed',
    completado: 'completed',
    completed: 'completed',
    cancelado: 'cancelled',
    cancelled: 'cancelled',
    no_show: 'no_show',
    'no show': 'no_show',
  };
  return map[val.toLowerCase().trim()] || 'pending';
}

interface GroupDecision {
  groupId: number;
  csvKeys?: string[];
  csvNames?: string[];
  action: 'create' | 'map' | 'skip';
  productId?: string;
  name_en?: string;
  name_es?: string;
  vendor_id?: string;
}

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

    // Build composite key (tour + legacy vendor id) -> product id map
    const csvKeyToProductId: Record<string, string> = {};

    // Preload vendors by legacy id, used to auto-link vendor on create groups
    const allGroupKeys = groups.flatMap((group) => group.csvKeys ?? group.csvNames ?? []);
    const allLegacyVendorIds = Array.from(
      new Set(
        allGroupKeys
          .map((key) => normalizeLegacyId(key.includes('|||') ? key.split('|||')[1] : ''))
          .filter((id) => id && id !== 'NO_VENDOR')
      )
    );
    const vendorIdByLegacyId = new Map<string, string>();
    const vendorIdByName = new Map<string, string>();
    if (allLegacyVendorIds.length > 0) {
      const legacyAsNames = allLegacyVendorIds.map((id) => id.toLowerCase());
      const vendorsRes = await query(
        `SELECT id, BTRIM(legacy_appsheet_id) AS legacy_appsheet_id
               , name
         FROM vendors
         WHERE BTRIM(legacy_appsheet_id) = ANY($1::text[])
            OR LOWER(name) = ANY($2::text[])`,
        [allLegacyVendorIds, legacyAsNames]
      );
      for (const vendor of vendorsRes.rows as { id: string; legacy_appsheet_id: string; name: string }[]) {
        if (vendor.legacy_appsheet_id) {
          vendorIdByLegacyId.set(vendor.legacy_appsheet_id, vendor.id);
        }
        vendorIdByName.set(vendor.name.toLowerCase(), vendor.id);
      }
    }

    for (const group of groups) {
      const csvKeys = group.csvKeys ?? group.csvNames ?? [];
      if (group.action === 'skip' || csvKeys.length === 0) continue;

      let productId: string | null = null;

      if (group.action === 'create' && group.name_en) {
        const fallbackLegacyVendorId = csvKeys
          .map((key) => normalizeLegacyId(key.includes('|||') ? key.split('|||')[1] : ''))
          .find((id) => id && id !== 'NO_VENDOR');
        const prelinkedVendorId =
          group.vendor_id ||
          (fallbackLegacyVendorId
            ? vendorIdByLegacyId.get(fallbackLegacyVendorId) ?? vendorIdByName.get(fallbackLegacyVendorId.toLowerCase())
            : null) ||
          null;

        const productRes = await query(
          `INSERT INTO tour_products (name_en, name_es, vendor_id)
           VALUES ($1, $2, $3) RETURNING id`,
          [group.name_en, group.name_es || group.name_en, prelinkedVendorId]
        );
        productId = productRes.rows[0].id;
      } else if (group.action === 'map' && group.productId) {
        productId = group.productId;
      }

      if (!productId) continue;

      for (const csvKey of csvKeys) {
        csvKeyToProductId[csvKey] = productId;
        const csvName = csvKey.includes('|||') ? csvKey.split('|||')[0] : csvKey;
        try {
          await query(
            `INSERT INTO tour_name_mappings (original_name, confirmed_product_id)
             VALUES ($1, $2)
             ON CONFLICT (original_name) DO UPDATE SET confirmed_product_id = $2`,
            [csvName, productId]
          );
        } catch {
          // non-fatal if mapping table is not present yet
        }
      }
    }

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
      const csvName = getField(
        row,
        'nombre_de_la_actividad',
        'product',
        'product_name',
        'actividad',
        'tour',
        'activity',
        'nombre_actividad'
      );
      const legacyVendorId = getField(row, 'id_vendedor', 'vendor_id', 'id_proveedor');
      const normalizedLegacyVendorId = normalizeLegacyId(legacyVendorId);
      const compositeKey = buildCompositeKey(csvName, legacyVendorId);

      const legacyId = getField(row, 'id', 'row_id', 'id_actividad', '_rownum', 'row_number');
      const dateVal = getField(row, 'date', 'fecha', 'fecha_actividad');
      const activityDate = parseDate(dateVal);
      if (!activityDate) {
        result.skipped++;
        continue;
      }

      const productId = csvKeyToProductId[compositeKey];
      if (!productId) {
        result.skipped++;
        continue;
      }
      const resolvedVendorId = normalizedLegacyVendorId
        ? vendorIdByLegacyId.get(normalizedLegacyVendorId) ?? vendorIdByName.get(normalizedLegacyVendorId.toLowerCase()) ?? null
        : null;

      const guestName = getField(row, 'guest', 'guest_name', 'huesped', 'nombre_completo');
      const guestLegacyId = getField(row, 'guest_id', 'id_huesped');
      const numGuests =
        parseInt(getField(row, 'numero_de_participantes', 'num_guests', 'huespedes', 'pax', 'cantidad_huespedes') || '1') || 1;
      const bookingMode = getField(row, 'booking_mode', 'modo', 'type', 'tipo_reserva') || 'shared';
      const totalPrice = parseFloat(getField(row, 'total_price', 'precio', 'price', 'precio_total') || '0') || null;
      const guestStatus = normalizeStatus(getField(row, 'estado_huesped', 'guest_status', 'estado'));
      const vendorStatus = normalizeStatus(getField(row, 'estado_vendodor', 'vendor_status', 'estado_proveedor'));
      const specialRequests = getField(row, 'special_requests', 'solicitudes', 'notes', 'notas') || null;
      const billedDate = parseDate(getField(row, 'fecha_facturado', 'billed_date', 'fecha_cobro', 'fecha_factura'));
      const paidDate = parseDate(getField(row, 'fecha_pagado', 'paid_date', 'fecha_pago'));
      const startTime = parseTime(getField(row, 'hora', 'start_time', 'time'));
      const legacyActivityName = csvName || null;

      try {
        await transaction(async (client) => {
          let guestId: string | null = null;
          if (guestLegacyId) {
            const guestByLegacy = await client.query('SELECT id FROM guests WHERE legacy_appsheet_id = $1', [guestLegacyId]);
            if (guestByLegacy.rows.length > 0) guestId = guestByLegacy.rows[0].id;
          }
          if (!guestId && guestName) {
            const guestByName = await client.query('SELECT id FROM guests WHERE full_name = $1 LIMIT 1', [guestName]);
            if (guestByName.rows.length > 0) {
              guestId = guestByName.rows[0].id;
            } else {
              const parts = guestName.trim().split(/\s+/);
              const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
              const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
              const insertedGuest = await client.query(
                `INSERT INTO guests (first_name, last_name, legacy_appsheet_id) VALUES ($1, $2, $3) RETURNING id`,
                [firstName, lastName, guestLegacyId || null]
              );
              guestId = insertedGuest.rows[0].id;
            }
          }

          const existingBooking = legacyId
            ? await client.query('SELECT id FROM tour_bookings WHERE legacy_appsheet_id = $1', [legacyId])
            : { rows: [] };

          if (existingBooking.rows.length > 0) {
            if (resolvedVendorId) {
              await client.query(
                `UPDATE tour_products
                 SET vendor_id = COALESCE(vendor_id, $1)
                 WHERE id = $2`,
                [resolvedVendorId, productId]
              );
            }
            await client.query(
              `UPDATE tour_bookings
               SET guest_id=$1, product_id=$2, num_guests=$3, booking_mode=$4,
                   total_price=$5, guest_status=$6, vendor_status=$7,
                   special_requests=$8, billed_date=$9, paid_date=$10,
                   activity_date=$11, start_time=$12,
                   legacy_vendor_id=$13, legacy_activity_name=$14,
                   legacy_guest_id=COALESCE(legacy_guest_id, NULLIF($16,''))
               WHERE id=$15`,
              [
                guestId,
                productId,
                numGuests,
                bookingMode,
                totalPrice,
                guestStatus,
                vendorStatus,
                specialRequests,
                billedDate,
                paidDate,
                activityDate,
                startTime,
                normalizedLegacyVendorId || null,
                legacyActivityName,
                existingBooking.rows[0].id,
                guestLegacyId || null,
              ]
            );
            result.updated++;
          } else {
            if (resolvedVendorId) {
              await client.query(
                `UPDATE tour_products
                 SET vendor_id = COALESCE(vendor_id, $1)
                 WHERE id = $2`,
                [resolvedVendorId, productId]
              );
            }
            await client.query(
              `INSERT INTO tour_bookings
               (guest_id, product_id, num_guests, booking_mode, total_price,
                guest_status, vendor_status, special_requests, billed_date, paid_date,
                activity_date, start_time, legacy_vendor_id, legacy_activity_name,
                legacy_appsheet_id, legacy_guest_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
              [
                guestId,
                productId,
                numGuests,
                bookingMode,
                totalPrice,
                guestStatus,
                vendorStatus,
                specialRequests,
                billedDate,
                paidDate,
                activityDate,
                startTime,
                normalizedLegacyVendorId || null,
                legacyActivityName,
                legacyId || null,
                guestLegacyId || null,
              ]
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
