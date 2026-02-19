import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * Normalizes Spanish/English status strings to the values accepted by the
 * transfers table CHECK constraint:
 *   ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
 */
function normalizeStatus(raw: string | undefined | null): string {
  if (!raw) return 'pending';
  const s = raw.trim().toLowerCase();
  if (s === 'confirmado' || s === 'confirmed') return 'confirmed';
  if (s === 'cancelado' || s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'completado' || s === 'completed') return 'completed';
  return 'pending';
}

/**
 * Splits a full name string into first_name / last_name for a minimal guest
 * INSERT when no existing guest record can be found.
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || '').trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/**
 * POST /api/admin/transfer-execution
 *
 * Finalizes the import of transfers based on analyzed and approved rows.
 * Accepts: { rows: Array<analysisRow> }
 * Each row: { csv, match, action, guest, vendor, userDate? }
 *
 * Each row is processed independently — one failure does not abort the rest.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    const { rows } = await request.json();
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    const result: { created: number; updated: number; errors: string[] } = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // ── Per-row processing ────────────────────────────────────────────────────
    for (const item of rows) {
      try {
        const { csv, match, action, userDate } = item;

        // Determine which actions are eligible
        const isEligible =
          action === 'CREATE' ||
          action === 'UPDATE' ||
          (action === 'INVALID_DATE' && userDate);

        if (!isEligible) continue;

        // Resolve the transfer date
        const transferDate: string | undefined = userDate || csv?.parsedDate;
        if (!transferDate) continue; // still no valid date — skip silently

        // ── Resolve guest_id ─────────────────────────────────────────────────
        let guestId: string | null = null;

        if (csv?.guestLegacyId) {
          const byLegacy = await query(
            `SELECT id FROM guests WHERE legacy_appsheet_id = $1 LIMIT 1`,
            [csv.guestLegacyId]
          );
          if (byLegacy.rows.length > 0) guestId = byLegacy.rows[0].id;
        }

        if (!guestId && csv?.guestName) {
          const byName = await query(
            `SELECT id FROM guests WHERE full_name ILIKE $1 LIMIT 1`,
            [csv.guestName]
          );
          if (byName.rows.length > 0) guestId = byName.rows[0].id;
        }

        if (!guestId && csv?.guestName) {
          // Insert a minimal guest record so the transfer is not orphaned
          const { firstName, lastName } = splitName(csv.guestName);
          const inserted = await query(
            `INSERT INTO guests (first_name, last_name) VALUES ($1, $2) RETURNING id`,
            [firstName, lastName]
          );
          if (inserted.rows.length > 0) guestId = inserted.rows[0].id;
        }

        // ── Resolve vendor_id ─────────────────────────────────────────────────
        let vendorId: string | null = null;

        if (csv?.vendorLegacyId) {
          const byLegacy = await query(
            `SELECT id FROM vendors WHERE legacy_appsheet_id = $1 LIMIT 1`,
            [csv.vendorLegacyId]
          );
          if (byLegacy.rows.length > 0) vendorId = byLegacy.rows[0].id;
        }

        if (!vendorId && csv?.vendorName) {
          const byName = await query(
            `SELECT id FROM vendors WHERE name ILIKE $1 LIMIT 1`,
            [csv.vendorName]
          );
          if (byName.rows.length > 0) vendorId = byName.rows[0].id;
        }

        // ── Normalize statuses ────────────────────────────────────────────────
        const guestStatus = normalizeStatus(csv?.guestStatus);
        const vendorStatus = normalizeStatus(csv?.vendorStatus);

        // ── UPDATE existing transfer ──────────────────────────────────────────
        if ((action === 'UPDATE' || action === 'INVALID_DATE') && match?.id) {
          await query(
            `UPDATE transfers
             SET date = $1,
                 time = $2,
                 guest_id = COALESCE($3, guest_id),
                 vendor_id = COALESCE($4, vendor_id),
                 origin = $5,
                 destination = $6,
                 num_passengers = $7,
                 guest_status = $8,
                 vendor_status = $9,
                 notes = $10,
                 legacy_guest_id = COALESCE(legacy_guest_id, NULLIF($11, '')),
                 legacy_vendor_id = COALESCE(legacy_vendor_id, NULLIF($12, '')),
                 legacy_appsheet_id = COALESCE(legacy_appsheet_id, NULLIF($13, ''))
             WHERE id = $14`,
            [
              transferDate,
              csv?.time || null,
              guestId,
              vendorId,
              csv?.origin || null,
              csv?.destination || null,
              csv?.numPassengers ?? 1,
              guestStatus,
              vendorStatus,
              csv?.notes || null,
              csv?.guestLegacyId || '',
              csv?.vendorLegacyId || '',
              csv?.legacyId || '',
              match.id,
            ]
          );
          result.updated++;

        // ── CREATE new transfer ───────────────────────────────────────────────
        } else if (action === 'CREATE' || (action === 'INVALID_DATE' && !match?.id)) {
          await query(
            `INSERT INTO transfers
               (date, time, guest_id, vendor_id, origin, destination,
                num_passengers, guest_status, vendor_status, notes,
                legacy_appsheet_id, legacy_guest_id, legacy_vendor_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              transferDate,
              csv?.time || null,
              guestId,
              vendorId,
              csv?.origin || null,
              csv?.destination || null,
              csv?.numPassengers ?? 1,
              guestStatus,
              vendorStatus,
              csv?.notes || null,
              csv?.legacyId || null,
              csv?.guestLegacyId || null,
              csv?.vendorLegacyId || null,
            ]
          );
          result.created++;
        }

      } catch (err: any) {
        result.errors.push(
          `Error processing row (guest: "${item.csv?.guestName}"): ${err.message}`
        );
      }
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
