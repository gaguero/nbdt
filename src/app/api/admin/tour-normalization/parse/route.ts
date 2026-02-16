import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
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

/**
 * POST /api/admin/tour-normalization/parse
 * Upload CSV → extract unique tour names → generate AI prompt.
 * Returns: { uniqueNames, nameCountMap, products, vendors, prompt, totalRows }
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
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const csvText = await file.text();
    const rows = parseCSV(csvText);
    if (rows.length === 0) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });

    // Extract unique tour names with booking counts, and track legacy IDs per name
    const nameCount: Record<string, number> = {};
    const nameLegacyIds: Record<string, string[]> = {};
    for (const row of rows) {
      const name = getField(row,
        'nombre_de_la_actividad', 'product', 'product_name',
        'actividad', 'tour', 'activity', 'nombre_actividad'
      );
      const legacyId = getField(row, 'id', 'row_id', 'id_actividad', '_rownum', 'row_number');
      if (name) {
        nameCount[name] = (nameCount[name] || 0) + 1;
        if (legacyId) {
          if (!nameLegacyIds[name]) nameLegacyIds[name] = [];
          nameLegacyIds[name].push(legacyId);
        }
      }
    }

    // Check which legacy IDs already exist in tour_bookings
    const allLegacyIds = Object.values(nameLegacyIds).flat();
    let existingIdSet = new Set<string>();
    if (allLegacyIds.length > 0) {
      const existingRes = await query(
        `SELECT legacy_appsheet_id FROM tour_bookings
         WHERE legacy_appsheet_id = ANY($1)`,
        [allLegacyIds]
      );
      existingIdSet = new Set(existingRes.rows.map((r: { legacy_appsheet_id: string }) => r.legacy_appsheet_id));
    }

    // Build per-name new vs existing counts
    const uniqueNames = Object.entries(nameCount)
      .map(([name, count]) => {
        const ids = nameLegacyIds[name] ?? [];
        const existingCount = ids.filter(id => existingIdSet.has(id)).length;
        return { name, count, newCount: count - existingCount, existingCount };
      })
      .sort((a, b) => b.count - a.count);

    // Fetch existing tour products
    const productsRes = await query(`
      SELECT tp.id, tp.name_en, tp.name_es, v.name AS vendor_name, v.id AS vendor_id
      FROM tour_products tp
      LEFT JOIN vendors v ON tp.vendor_id = v.id
      WHERE tp.is_active = true
      ORDER BY tp.name_en
    `);

    // Fetch all active vendors for the review step
    const vendorsRes = await query(`
      SELECT id, name, type FROM vendors WHERE is_active = true ORDER BY name
    `);

    // Build AI prompt — show new vs existing counts so AI knows which ones really need mapping
    const namesList = uniqueNames
      .map(n => {
        const detail = n.existingCount > 0
          ? `${n.newCount} new + ${n.existingCount} already imported`
          : `${n.count} booking${n.count !== 1 ? 's' : ''}`;
        return `"${n.name}" (${detail})`;
      })
      .join('\n');

    const productsList = productsRes.rows.length > 0
      ? productsRes.rows.map(p =>
          `ID: ${p.id} | EN: ${p.name_en} | ES: ${p.name_es} | Vendor: ${p.vendor_name ?? 'none'}`
        ).join('\n')
      : '(no existing tour products yet — all will be created as new)';

    const prompt = `You are a tour data normalization expert for a luxury hotel concierge platform.
Below are tour activity names extracted from a historical CSV import, with their booking counts.
Your job is to group name variants that refer to the same real tour, then map each group to an
existing product or propose a new one.

EXISTING TOUR PRODUCTS (already in the system):
${productsList}

CSV TOUR NAMES TO NORMALIZE (with booking counts):
${namesList}

INSTRUCTIONS:
1. Group CSV names that clearly refer to the same real-world tour or activity
   (typos, abbreviations, Spanish/English variants, partial names, etc.).
2. For each group decide:
   - "map"    → it matches an existing product above (provide its productId)
   - "create" → it is a new tour not yet in the system (provide name_en and name_es)
   - "skip"   → the entry is invalid / test data (e.g. "cancelado", "n/a", blank)
3. Suggest clear, professional names for new tours (English and Spanish).
4. Every CSV name must appear in exactly one group.
5. Return ONLY a valid JSON array — no markdown, no explanation outside the JSON.

OUTPUT FORMAT (return exactly this structure):
[
  {
    "groupId": 1,
    "csvNames": ["Snorkeling", "Snorkel trip", "Snorkeling Tour"],
    "action": "create",
    "name_en": "Snorkeling Tour",
    "name_es": "Tour de Snorkel"
  },
  {
    "groupId": 2,
    "csvNames": ["Sunset Cruise"],
    "action": "map",
    "productId": "paste-existing-product-uuid-here"
  },
  {
    "groupId": 3,
    "csvNames": ["cancelado", "test"],
    "action": "skip"
  }
]`;

    const totalExisting = uniqueNames.reduce((s, n) => s + n.existingCount, 0);
    const totalNew = rows.length - totalExisting;

    return NextResponse.json({
      uniqueNames,
      nameCountMap: nameCount,
      products: productsRes.rows,
      vendors: vendorsRes.rows,
      prompt,
      totalRows: rows.length,
      totalNew,
      totalExisting,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
