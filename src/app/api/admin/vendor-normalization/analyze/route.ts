import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * GET /api/admin/vendor-normalization/analyze
 * Returns all vendors with usage counts + a ready-to-paste AI prompt.
 * No AI API key required — the prompt is given to the user to paste into any LLM.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vendorsRes = await query(`
      SELECT
        v.id, v.name, v.type, v.email, v.phone, v.is_active,
        COUNT(DISTINCT t.id)::int  AS transfer_count,
        COUNT(DISTINCT tp.id)::int AS tour_product_count
      FROM vendors v
      LEFT JOIN transfers t ON t.vendor_id = v.id
      LEFT JOIN tour_products tp ON tp.vendor_id = v.id
      GROUP BY v.id
      ORDER BY v.name
    `);
    const vendors = vendorsRes.rows;

    const vendorList = vendors.map(v =>
      `ID: ${v.id} | Name: "${v.name}" | Type: ${v.type} | Transfers: ${v.transfer_count} | TourProducts: ${v.tour_product_count} | Active: ${v.is_active}`
    ).join('\n');

    const prompt = `You are a data deduplication expert for a luxury hotel concierge platform.
Below is the full vendor list from the database. Your job is to find groups of vendors that represent the SAME real-world company but were entered differently (spelling variations, typos, abbreviations, partial names, language differences, etc.).

VENDOR LIST:
${vendorList}

INSTRUCTIONS:
1. Group vendors that are clearly the same entity.
2. For each group, pick the best "master" record — prefer: most transfers/tour products, most complete name, correct spelling, active record.
3. Also flag records that are clearly invalid (e.g. name is "cancelado", "n/a", "test", empty, etc.) as their own group with reason "invalid_record".
4. Only include groups with 2+ members (or 1 invalid record). Do NOT list vendors that are clearly unique.
5. Return ONLY a valid JSON array, no markdown, no explanation outside the JSON.

OUTPUT FORMAT (return exactly this JSON structure):
[
  {
    "groupId": 1,
    "reason": "short explanation of why these are duplicates",
    "vendors": [
      { "id": "uuid-here", "name": "vendor name", "isSuggestedMaster": true },
      { "id": "uuid-here", "name": "vendor name", "isSuggestedMaster": false }
    ]
  }
]`;

    return NextResponse.json({ vendors, prompt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
