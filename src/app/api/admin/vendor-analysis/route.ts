import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
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

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function normalizeType(raw: string): 'transfer' | 'tour' | 'spa' | 'restaurant' | 'other' {
  const val = (raw || '').trim().toLowerCase();
  if (!val) return 'other';
  if (['transfer', 'transfers', 'transportation', 'traslado', 'traslados'].includes(val)) return 'transfer';
  if (['tour', 'tours', 'tour operador', 'tour_operator', 'actividad', 'actividades'].includes(val)) return 'tour';
  if (['spa'].includes(val)) return 'spa';
  if (['restaurant', 'restaurante'].includes(val)) return 'restaurant';
  return 'other';
}

function normalizeColor(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '#6B7280';
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return '#6B7280';
}

function classifyVendorName(name: string): { skip: boolean; reason?: string } {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return { skip: true, reason: 'Missing vendor name' };
  if (/^[#0\.\*x\s]+$/.test(trimmed)) return { skip: true, reason: 'Junk data: symbols/zeros only' };
  if (['cancelado', 'cancelled', 'canceled', 'none', 'n/a', 'na', 'sin proveedor'].includes(trimmed)) {
    return { skip: true, reason: `Junk data: "${name}"` };
  }
  return { skip: false };
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
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const csvText = await file.text();
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });

    const headers = parseCSVLine(lines[0]).map((header) =>
      header.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    );

    const parsedRows = lines.slice(1).map((line) => {
      const vals = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = (vals[index] ?? '').trim();
      });

      const legacyId = pick(row, 'id_vendedor', 'vendor_id', 'id', 'row_id', '_rownum');
      const name = pick(row, 'nombre', 'name', 'vendor_name');
      const phone = pick(row, 'telefono', 'phone', 'tel', 'mobile');
      const email = pick(row, 'correo', 'email');
      const rawType = pick(row, 'tipo', 'type');
      const rawColor = pick(row, 'nombrecolor', 'color_code', 'color', 'colour');
      const notes = pick(row, 'notas', 'notes');
      const isActiveRaw = pick(row, 'activo', 'is_active', 'active');

      return {
        legacyId,
        name,
        phone,
        email,
        rawType,
        type: normalizeType(rawType),
        colorCode: normalizeColor(rawColor),
        notes,
        isActive: isActiveRaw ? ['true', '1', 'yes', 'si', 's'].includes(isActiveRaw.toLowerCase()) : true,
      };
    });

    const classified = parsedRows.map((row) => {
      const rowClass = classifyVendorName(row.name);
      if (rowClass.skip) {
        return { row, action: 'SKIP' as const, reason: rowClass.reason ?? 'Skipped row' };
      }
      return { row, action: 'PENDING' as const, reason: 'Ready for matching' };
    });

    const nonSkipRows = classified.filter((item) => item.action === 'PENDING').map((item) => item.row);
    const allLegacyIds = nonSkipRows.map((row) => row.legacyId).filter(Boolean);
    const allNames = nonSkipRows.map((row) => row.name.toLowerCase()).filter(Boolean);
    const allEmails = nonSkipRows.map((row) => row.email.toLowerCase()).filter(Boolean);
    const allPhones = nonSkipRows.map((row) => row.phone).filter(Boolean);

    const existingVendors =
      allLegacyIds.length || allNames.length || allEmails.length || allPhones.length
        ? await queryMany(
            `SELECT id, name, email, phone, type, color_code, is_active, legacy_appsheet_id
             FROM vendors
             WHERE legacy_appsheet_id = ANY($1::text[])
                OR LOWER(name) = ANY($2::text[])
                OR LOWER(COALESCE(email, '')) = ANY($3::text[])
                OR COALESCE(phone, '') = ANY($4::text[])`,
            [allLegacyIds, allNames, allEmails, allPhones]
          )
        : [];

    const byLegacy = new Map(existingVendors.filter((v: any) => v.legacy_appsheet_id).map((v: any) => [v.legacy_appsheet_id, v]));
    const byName = new Map(existingVendors.map((v: any) => [v.name.toLowerCase(), v]));
    const byEmail = new Map(existingVendors.filter((v: any) => v.email).map((v: any) => [v.email.toLowerCase(), v]));
    const byPhone = new Map(existingVendors.filter((v: any) => v.phone).map((v: any) => [v.phone, v]));

    const analysis = classified.map((item) => {
      const row = item.row;
      if (item.action === 'SKIP') {
        return { csv: row, match: null, action: 'SKIP' as const, reason: item.reason };
      }

      const legacyMatch = row.legacyId ? byLegacy.get(row.legacyId) : null;
      if (legacyMatch) {
        return {
          csv: row,
          match: {
            id: legacyMatch.id,
            name: legacyMatch.name,
            legacyId: legacyMatch.legacy_appsheet_id,
            email: legacyMatch.email,
            phone: legacyMatch.phone,
          },
          action: 'UPDATE' as const,
          reason: 'Legacy ID match',
        };
      }

      const nameMatch = row.name ? byName.get(row.name.toLowerCase()) : null;
      if (nameMatch) {
        return {
          csv: row,
          match: {
            id: nameMatch.id,
            name: nameMatch.name,
            legacyId: nameMatch.legacy_appsheet_id,
            email: nameMatch.email,
            phone: nameMatch.phone,
          },
          action: 'UPDATE' as const,
          reason: 'Name match',
        };
      }

      const contactMatch =
        (row.email ? byEmail.get(row.email.toLowerCase()) : null) ||
        (row.phone ? byPhone.get(row.phone) : null);

      if (contactMatch) {
        return {
          csv: row,
          match: {
            id: contactMatch.id,
            name: contactMatch.name,
            legacyId: contactMatch.legacy_appsheet_id,
            email: contactMatch.email,
            phone: contactMatch.phone,
          },
          action: 'CONFLICT' as const,
          reason: 'Contact match with different name',
        };
      }

      return { csv: row, match: null, action: 'CREATE' as const, reason: 'New vendor' };
    });

    return NextResponse.json({
      summary: {
        total: analysis.length,
        create: analysis.filter((row) => row.action === 'CREATE').length,
        update: analysis.filter((row) => row.action === 'UPDATE').length,
        conflict: analysis.filter((row) => row.action === 'CONFLICT').length,
        skip: analysis.filter((row) => row.action === 'SKIP').length,
        withLegacyId: analysis.filter((row) => row.csv.legacyId).length,
      },
      analysis,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
