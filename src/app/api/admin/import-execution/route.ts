import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * POST /api/admin/import-execution
 * Finalizes the import of guests based on analyzed and approved rows.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { rows } = await request.json();
    if (!rows || !Array.isArray(rows)) return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

    const result: { created: number; updated: number; errors: string[] } = { created: 0, updated: 0, errors: [] };

    await transaction(async (client) => {
      for (const item of rows) {
        try {
          const { csv, match, action, inferredProfileType } = item;

          // Only process CREATE and UPDATE actions
          if (action === 'CREATE') {
            await client.query(
              `INSERT INTO guests (first_name, last_name, email, phone, nationality, notes, companion_name, legacy_appsheet_id, crm_metadata, profile_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [csv.firstName, csv.lastName, csv.email, csv.phone, csv.nationality, csv.notes, csv.companion, csv.legacyId, JSON.stringify(csv.stats), inferredProfileType || 'guest']
            );
            result.created++;
          } else if (action === 'UPDATE' && match) {
            await client.query(
              `UPDATE guests SET
                email = COALESCE(NULLIF($1, ''), email),
                phone = COALESCE(NULLIF($2, ''), phone),
                companion_name = COALESCE(NULLIF($3, ''), companion_name),
                crm_metadata = $4::jsonb,
                profile_type = $5
               WHERE id = $6::uuid`,
              [csv.email, csv.phone, csv.companion, JSON.stringify(csv.stats), inferredProfileType || 'guest', match.id]
            );
            result.updated++;
          }
          // SKIP, INTRA_DUPLICATE, INCOMPLETE rows are silently ignored
        } catch (err: any) {
          result.errors.push(`Error processing ${item.csv.fullName}: ${err.message}`);
        }
      }
    });

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
