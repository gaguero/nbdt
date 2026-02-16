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
 * POST /api/admin/import-analysis
 * Analyzes a Guest CSV file before actual import.
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
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });

    const headers = parseCSVLine(lines[0]).map(h => 
      h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    );

    const analysis = [];
    const rows = lines.slice(1);

    for (const line of rows) {
      const vals = parseCSVLine(line);
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });

      // Map critical fields
      const legacyId = row.id_huesped || '';
      const fullName = row.nombre_completo || '';
      const email = row.email || '';
      const firstName = row.nombre || '';
      const lastName = row.apellido || '';
      const companion = row.acompaante || '';
      const vip = parseInt(row.vip) || 0;

      // Logic: Split companion if present in Name
      const cleanFirstName = firstName;
      const cleanLastName = lastName;
      let detectedCompanion = companion;

      if (fullName.includes(' y ')) {
        const parts = fullName.split(' y ');
        detectedCompanion = parts[1].trim();
      }

      // Search for match in DB
      const existing = await queryMany(`
        SELECT id, first_name, last_name, full_name, email, legacy_appsheet_id, nationality, companion_name
        FROM guests
        WHERE legacy_appsheet_id = $1::text
           OR (email = $2::text AND email IS NOT NULL AND email != '')
           OR (LOWER(full_name) = LOWER($3::text))
        LIMIT 1
      `, [legacyId, email, fullName]);

      const match = existing[0] || null;
      let action: 'CREATE' | 'UPDATE' | 'CONFLICT' = 'CREATE';
      let reason = 'New Profile';

      if (match) {
        if (match.legacy_appsheet_id === legacyId || match.email === email) {
          action = 'UPDATE';
          reason = 'ID/Email Match';
        } else {
          action = 'CONFLICT';
          reason = 'Similar Name found';
        }
      }

      analysis.push({
        csv: {
          legacyId,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          fullName,
          email,
          phone: row.telefono || '',
          nationality: row.pais || '',
          companion: detectedCompanion,
          vip,
          notes: row.notas || '',
          stats: {
            arrivals: row.llegadas || '0',
            nights: row.noches || '0',
            revenue: row.room_revenue || '0'
          }
        },
        match: match ? {
          id: match.id,
          fullName: match.full_name,
          email: match.email,
          legacyId: match.legacy_appsheet_id
        } : null,
        action,
        reason
      });
    }

    return NextResponse.json({ 
      summary: {
        total: analysis.length,
        create: analysis.filter(a => a.action === 'CREATE').length,
        update: analysis.filter(a => a.action === 'UPDATE').length,
        conflict: analysis.filter(a => a.action === 'CONFLICT').length
      },
      analysis 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
