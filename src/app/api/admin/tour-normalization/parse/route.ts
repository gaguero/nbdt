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
 * Upload a tour bookings CSV, extract unique tour names, fuzzy-match against tour_products.
 * Returns: { uniqueNames, matches } where matches is name → { product | null, rowCount }
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

    // Count rows per tour name
    const nameCount: Record<string, number> = {};
    for (const row of rows) {
      const name = getField(row,
        'nombre_de_la_actividad', 'product', 'product_name',
        'actividad', 'tour', 'activity', 'nombre_actividad'
      );
      if (name) {
        nameCount[name] = (nameCount[name] || 0) + 1;
      }
    }

    const uniqueNames = Object.keys(nameCount);

    // Fetch all tour products
    const productsRes = await query(`
      SELECT tp.id, tp.name_en, tp.name_es, v.name as vendor_name
      FROM tour_products tp
      LEFT JOIN vendors v ON tp.vendor_id = v.id
      WHERE tp.is_active = true
      ORDER BY tp.name_en
    `);
    const products = productsRes.rows;

    // Try to fuzzy-match each unique name
    const matches: Record<string, {
      type: 'exact' | 'fuzzy' | 'none';
      product: { id: string; name_en: string; name_es: string; vendor_name: string } | null;
      rowCount: number;
    }> = {};

    for (const name of uniqueNames) {
      const nameLower = name.toLowerCase().trim();

      // Exact match (case-insensitive)
      const exact = products.find(p =>
        p.name_en.toLowerCase() === nameLower ||
        p.name_es.toLowerCase() === nameLower
      );
      if (exact) {
        matches[name] = { type: 'exact', product: exact, rowCount: nameCount[name] };
        continue;
      }

      // Fuzzy: check if product name contains the CSV name or vice versa
      const fuzzy = products.find(p =>
        p.name_en.toLowerCase().includes(nameLower) ||
        nameLower.includes(p.name_en.toLowerCase()) ||
        p.name_es.toLowerCase().includes(nameLower) ||
        nameLower.includes(p.name_es.toLowerCase())
      );
      if (fuzzy) {
        matches[name] = { type: 'fuzzy', product: fuzzy, rowCount: nameCount[name] };
        continue;
      }

      matches[name] = { type: 'none', product: null, rowCount: nameCount[name] };
    }

    // Store csv rows in session via JSON response so execute can use them
    return NextResponse.json({ matches, products, totalRows: rows.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
