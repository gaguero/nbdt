import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * Robust CSV Line Parser
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && inQuotes && line[i + 1] === '"') {
      current += '"'; i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim()); current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Parse a date string into 'YYYY-MM-DD' format.
 * Supports M/D/YYYY, M/D/YY, and YYYY-MM-DD formats.
 * Returns null if the date is invalid or empty.
 */
function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  let year: number, month: number, day: number;

  // Try slash-separated formats: M/D/YYYY or M/D/YY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    month = parseInt(slashMatch[1], 10);
    day = parseInt(slashMatch[2], 10);
    year = parseInt(slashMatch[3], 10);

    // Two-digit year: add 2000
    if (year < 100) {
      year += 2000;
    }

    // Reject implausible years (e.g. 0263)
    if (year < 1990 || year > 2099) return null;

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Try ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);

    if (year < 1990 || year > 2099) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

function normalizeText(raw: string): string {
  return (raw || '').trim();
}

/**
 * POST /api/admin/transfer-analysis
 * Analyzes a Transfer CSV file before actual import.
 */
export async function POST(request: NextRequest) {
  try {
    // --- Auth ---
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- File ---
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const csvText = await file.text();
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });

    // --- Phase A: Parse headers ---
    const headers = parseCSVLine(lines[0]).map(h =>
      h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    );

    // Helper to extract the first matching column from a row object
    function pick(row: Record<string, string>, ...keys: string[]): string {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return row[k];
      }
      return '';
    }

    // --- Phase B: Parse all CSV rows (pure JS, no DB calls) ---
    const parsedRows = lines.slice(1).map(line => {
      const vals = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });

      const legacyId      = pick(row, 'id_traslado', 'transfer_id', 'id', 'row_id');
      const rawDate       = pick(row, 'fecha', 'date', 'date_traslado');
      const time          = pick(row, 'hora', 'time', 'hora_traslado');
      const guestLegacyId = pick(row, 'id_huesped', 'guest_id');
      const guestName     = pick(row, 'huesped', 'guest', 'guest_name', 'nombre_completo', 'nombre_huesped');
      const vendorLegacyId = normalizeText(pick(row, 'id_proveedor', 'vendor_id', 'id_vendedor'));
      const vendorName = normalizeText(
        pick(row, 'proveedor', 'vendor', 'vendor_name', 'nombre_proveedor', 'vendedor', 'nombre_vendedor')
      );
      const origin        = pick(row, 'origen', 'origin', 'lugar_origen');
      const destination   = pick(row, 'destino', 'destination', 'lugar_destino');
      const numPassengersRaw = pick(row, 'num_passengers', 'pasajeros', 'pax', 'cantidad_pasajeros');
      const numPassengers = parseInt(numPassengersRaw, 10) || 1;
      const guestStatus   = pick(row, 'estado_huesped', 'guest_status', 'estado');
      const vendorStatus  = pick(row, 'estado_vendedor', 'estado_vendodor', 'vendor_status');
      const notes         = pick(row, 'notas', 'notes', 'observaciones');
      const billedDate    = pick(row, 'fecha_facturado', 'billed_date', 'fecha_cobro');
      const paidDate      = pick(row, 'fecha_pagado', 'paid_date', 'fecha_pago');

      const parsedDate = parseDate(rawDate);

      return {
        legacyId,
        rawDate,
        parsedDate,
        time,
        guestLegacyId,
        guestName,
        vendorLegacyId,
        vendorName,
        origin,
        destination,
        numPassengers,
        guestStatus,
        vendorStatus,
        notes,
        billedDate,
        paidDate
      };
    });

    // --- Phase C: Classify each row ---
    type Action = 'CREATE' | 'UPDATE' | 'INVALID_DATE' | 'SKIP';

    const classified = parsedRows.map(r => {
      // Completely blank row: no date and no legacyId
      if (!r.rawDate && !r.legacyId) {
        return { row: r, action: 'SKIP' as Action, reason: 'Blank row' };
      }

      // Has a legacyId but no date — cannot import without a date
      if (!r.rawDate && r.legacyId) {
        return { row: r, action: 'SKIP' as Action, reason: 'No date for transfer' };
      }

      // Non-empty rawDate that failed to parse
      if (r.rawDate && r.parsedDate === null) {
        return { row: r, action: 'INVALID_DATE' as Action, reason: `Unparseable date: "${r.rawDate}"` };
      }

      // Otherwise: valid date — will be resolved as CREATE or UPDATE after DB lookup
      return { row: r, action: 'CREATE' as Action, reason: 'New Transfer' };
    });

    // --- Phase D: ONE batch DB query for all actionable rows ---
    const actionableRows = classified.filter(c => c.action === 'CREATE');

    const allTransferLegacyIds  = actionableRows.map(c => c.row.legacyId).filter(Boolean);
    const allGuestLegacyIds     = actionableRows.map(c => c.row.guestLegacyId).filter(Boolean);
    const allGuestNames         = actionableRows.map(c => c.row.guestName.toLowerCase()).filter(Boolean);
    const allVendorLegacyIds    = actionableRows.map(c => normalizeText(c.row.vendorLegacyId)).filter(Boolean);
    const allVendorNamesFromNameColumn = actionableRows.map(c => c.row.vendorName.toLowerCase()).filter(Boolean);
    const allVendorNamesFromLegacyColumn = actionableRows.map(c => normalizeText(c.row.vendorLegacyId).toLowerCase()).filter(Boolean);
    const allVendorNames = Array.from(new Set([...allVendorNamesFromNameColumn, ...allVendorNamesFromLegacyColumn]));

    const [existingTransfers, existingGuests, existingVendors] = await Promise.all([
      allTransferLegacyIds.length
        ? queryMany(
            `SELECT id, legacy_appsheet_id FROM transfers WHERE legacy_appsheet_id = ANY($1::text[])`,
            [allTransferLegacyIds]
          )
        : Promise.resolve([]),

      (allGuestLegacyIds.length || allGuestNames.length)
        ? queryMany(
            `SELECT id, full_name, legacy_appsheet_id
             FROM guests
             WHERE legacy_appsheet_id = ANY($1::text[])
                OR LOWER(full_name) = ANY($2::text[])`,
            [allGuestLegacyIds, allGuestNames]
          )
        : Promise.resolve([]),

      (allVendorLegacyIds.length || allVendorNames.length)
        ? queryMany(
            `SELECT id, name, BTRIM(legacy_appsheet_id) AS legacy_appsheet_id
             FROM vendors
             WHERE BTRIM(legacy_appsheet_id) = ANY($1::text[])
                OR LOWER(name) = ANY($2::text[])`,
            [allVendorLegacyIds, allVendorNames]
          )
        : Promise.resolve([])
    ]);

    // --- Phase E: Build lookup maps ---
    const transferByLegacyId = new Map(
      existingTransfers.filter((t: any) => t.legacy_appsheet_id).map((t: any) => [t.legacy_appsheet_id, t])
    );

    const guestByLegacyId = new Map(
      existingGuests.filter((g: any) => g.legacy_appsheet_id).map((g: any) => [g.legacy_appsheet_id, g])
    );
    const guestByName = new Map(
      existingGuests.map((g: any) => [g.full_name.toLowerCase(), g])
    );

    const vendorByLegacyId = new Map(
      existingVendors.filter((v: any) => v.legacy_appsheet_id).map((v: any) => [v.legacy_appsheet_id, v])
    );
    const vendorByName = new Map(
      existingVendors.map((v: any) => [v.name.toLowerCase(), v])
    );

    // --- Phase F: Resolve action and build analysis array ---
    const analysis = classified.map(c => {
      const r = c.row;

      // For SKIP / INVALID_DATE rows, return early with no match info
      if (c.action === 'SKIP' || c.action === 'INVALID_DATE') {
        return {
          csv: {
            legacyId:       r.legacyId,
            rawDate:        r.rawDate,
            parsedDate:     r.parsedDate,
            time:           r.time,
            guestName:      r.guestName,
            guestLegacyId:  r.guestLegacyId,
            vendorName:     r.vendorName,
            vendorLegacyId: r.vendorLegacyId,
            origin:         r.origin,
            destination:    r.destination,
            numPassengers:  r.numPassengers,
            guestStatus:    r.guestStatus,
            vendorStatus:   r.vendorStatus,
            notes:          r.notes
          },
          match:  null,
          guest:  null,
          vendor: null,
          action: c.action,
          reason: c.reason
        };
      }

      // Resolve transfer match
      const transferMatch = r.legacyId ? transferByLegacyId.get(r.legacyId) ?? null : null;

      // Determine action: UPDATE if transfer exists in DB, CREATE otherwise
      const action: Action = transferMatch ? 'UPDATE' : 'CREATE';
      const reason = transferMatch ? 'Transfer ID Match' : 'New Transfer';

      // Resolve guest
      const guestMatch = (r.guestLegacyId ? guestByLegacyId.get(r.guestLegacyId) : undefined)
                      ?? (r.guestName     ? guestByName.get(r.guestName.toLowerCase()) : undefined)
                      ?? null;

      // Resolve vendor
      const vendorMatch = (r.vendorLegacyId ? vendorByLegacyId.get(normalizeText(r.vendorLegacyId)) : undefined)
                       ?? (r.vendorName     ? vendorByName.get(r.vendorName.toLowerCase()) : undefined)
                       ?? (r.vendorLegacyId ? vendorByName.get(normalizeText(r.vendorLegacyId).toLowerCase()) : undefined)
                       ?? null;

      return {
        csv: {
          legacyId:       r.legacyId,
          rawDate:        r.rawDate,
          parsedDate:     r.parsedDate,
          time:           r.time,
          guestName:      r.guestName,
          guestLegacyId:  r.guestLegacyId,
          vendorName:     r.vendorName,
          vendorLegacyId: r.vendorLegacyId,
          origin:         r.origin,
          destination:    r.destination,
          numPassengers:  r.numPassengers,
          guestStatus:    r.guestStatus,
          vendorStatus:   r.vendorStatus,
          notes:          r.notes
        },
        match:  transferMatch ? { id: transferMatch.id, legacyId: transferMatch.legacy_appsheet_id } : null,
        guest:  guestMatch    ? { id: guestMatch.id,   fullName: guestMatch.full_name }              : null,
        vendor: vendorMatch   ? { id: vendorMatch.id,  name: vendorMatch.name }                      : null,
        action,
        reason
      };
    });

    // --- Summary ---
    return NextResponse.json({
      summary: {
        total:       analysis.length,
        create:      analysis.filter(a => a.action === 'CREATE').length,
        update:      analysis.filter(a => a.action === 'UPDATE').length,
        invalidDate: analysis.filter(a => a.action === 'INVALID_DATE').length,
        skip:        analysis.filter(a => a.action === 'SKIP').length
      },
      analysis
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
