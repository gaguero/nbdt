import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

interface MergeGroup {
  masterId: string;
  duplicateIds: string[];
}

/**
 * POST /api/admin/vendor-normalization/execute
 * Body: { merges: MergeGroup[] }
 *
 * For each merge:
 *   1. Re-point all transfers, tour_products, vendor_users to masterId
 *   2. Mark duplicate vendors as inactive with a [MERGED] suffix
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const merges: MergeGroup[] = body.merges ?? [];

    if (!merges.length) {
      return NextResponse.json({ error: 'No merges provided' }, { status: 400 });
    }

    const result = {
      groupsProcessed: 0,
      vendorsDeactivated: 0,
      transfersUpdated: 0,
      tourProductsUpdated: 0,
      vendorUsersUpdated: 0,
      errors: [] as string[],
    };

    for (const merge of merges) {
      if (!merge.masterId || !merge.duplicateIds?.length) continue;

      try {
        await transaction(async (client) => {
          for (const dupId of merge.duplicateIds) {
            // Re-point transfers
            const t = await client.query(
              `UPDATE transfers SET vendor_id = $1 WHERE vendor_id = $2`,
              [merge.masterId, dupId]
            );
            result.transfersUpdated += t.rowCount ?? 0;

            // Re-point tour_products
            const tp = await client.query(
              `UPDATE tour_products SET vendor_id = $1 WHERE vendor_id = $2`,
              [merge.masterId, dupId]
            );
            result.tourProductsUpdated += tp.rowCount ?? 0;

            // Re-point vendor_users — skip conflicts (same email already on master)
            const existingEmails = await client.query(
              `SELECT email FROM vendor_users WHERE vendor_id = $1`,
              [merge.masterId]
            );
            const masterEmails = new Set(existingEmails.rows.map((r: { email: string }) => r.email));

            const dupUsers = await client.query(
              `SELECT id, email FROM vendor_users WHERE vendor_id = $1`,
              [dupId]
            );
            for (const vu of dupUsers.rows) {
              if (masterEmails.has(vu.email)) {
                // Conflict: deactivate the duplicate user instead of moving it
                await client.query(
                  `UPDATE vendor_users SET is_active = false WHERE id = $1`,
                  [vu.id]
                );
              } else {
                await client.query(
                  `UPDATE vendor_users SET vendor_id = $1 WHERE id = $2`,
                  [merge.masterId, vu.id]
                );
                result.vendorUsersUpdated++;
              }
            }

            // Deactivate the duplicate vendor, mark with suffix so it's clearly merged
            await client.query(
              `UPDATE vendors SET is_active = false, name = name || ' [MERGED]' WHERE id = $1 AND name NOT LIKE '%[MERGED]%'`,
              [dupId]
            );
            result.vendorsDeactivated++;
          }
        });
        result.groupsProcessed++;
      } catch (err: any) {
        result.errors.push(`Group master=${merge.masterId}: ${err.message}`);
      }
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
