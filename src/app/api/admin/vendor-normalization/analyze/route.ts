import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface VendorGroup {
  groupId: number;
  reason: string;
  vendors: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    is_active: boolean;
    transfer_count: number;
    tour_product_count: number;
    isSuggestedMaster: boolean;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    // Fetch all vendors with usage counts
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

    // Build a compact list for Gemini
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
4. Only include groups with 2+ members (or 1 invalid record). Do NOT include vendors that are clearly unique.
5. Return ONLY a valid JSON array, no markdown, no explanation.

OUTPUT FORMAT (JSON array):
[
  {
    "groupId": 1,
    "reason": "short explanation of why these are duplicates",
    "vendors": [
      { "id": "uuid", "name": "vendor name", "isSuggestedMaster": true },
      { "id": "uuid", "name": "vendor name", "isSuggestedMaster": false }
    ]
  }
]`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned unexpected response', raw: text.slice(0, 500) }, { status: 500 });
    }

    const rawGroups: { groupId: number; reason: string; vendors: { id: string; name: string; isSuggestedMaster: boolean }[] }[] = JSON.parse(jsonMatch[0]);

    // Enrich groups with full vendor data from DB
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    const groups: VendorGroup[] = rawGroups.map(g => ({
      ...g,
      vendors: g.vendors.map(gv => {
        const full = vendorMap.get(gv.id);
        return {
          id: gv.id,
          name: full?.name ?? gv.name,
          type: full?.type ?? 'other',
          email: full?.email ?? null,
          phone: full?.phone ?? null,
          is_active: full?.is_active ?? false,
          transfer_count: full?.transfer_count ?? 0,
          tour_product_count: full?.tour_product_count ?? 0,
          isSuggestedMaster: gv.isSuggestedMaster,
        };
      }),
    }));

    return NextResponse.json({ groups, totalVendors: vendors.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
