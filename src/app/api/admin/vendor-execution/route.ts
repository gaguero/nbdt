import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

type VendorAction = 'CREATE' | 'UPDATE' | 'CONFLICT' | 'SKIP';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rows } = await request.json();
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    const result: { created: number; updated: number; errors: string[] } = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const item of rows) {
      try {
        const action: VendorAction = item.action;
        if (action !== 'CREATE' && action !== 'UPDATE') continue;

        const csv = item.csv ?? {};
        const name = (csv.name || '').trim();
        if (!name) continue;

        if (action === 'CREATE') {
          await query(
            `INSERT INTO vendors (name, email, phone, type, color_code, is_active, notes, legacy_appsheet_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              name,
              csv.email || null,
              csv.phone || null,
              csv.type || 'other',
              csv.colorCode || '#6B7280',
              csv.isActive ?? true,
              csv.notes || null,
              csv.legacyId || null,
            ]
          );
          result.created++;
          continue;
        }

        const targetId = item.match?.id;
        if (!targetId) continue;

        await query(
          `UPDATE vendors SET
             name = $1,
             email = COALESCE(NULLIF($2, ''), email),
             phone = COALESCE(NULLIF($3, ''), phone),
             type = $4,
             color_code = $5,
             is_active = $6,
             notes = COALESCE(NULLIF($7, ''), notes),
             legacy_appsheet_id = COALESCE(legacy_appsheet_id, NULLIF($8, ''))
           WHERE id = $9::uuid`,
          [
            name,
            csv.email || '',
            csv.phone || '',
            csv.type || 'other',
            csv.colorCode || '#6B7280',
            csv.isActive ?? true,
            csv.notes || '',
            csv.legacyId || '',
            targetId,
          ]
        );
        result.updated++;
      } catch (err: any) {
        result.errors.push(`Error processing vendor "${item?.csv?.name ?? 'unknown'}": ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
