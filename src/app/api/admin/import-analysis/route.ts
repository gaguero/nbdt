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
 * Fix C: Classify a row as SKIP or infer profile type
 */
function classifyRow(primaryName: string, _legacyId: string, _email: string): {
  skip: boolean;
  skipReason?: string;
  inferredProfileType?: 'guest' | 'staff' | 'visitor' | 'musician' | 'artist' | 'other';
} {
  const trimmed = primaryName.trim().toLowerCase();

  // SKIP triggers: symbols/zeros/dots only
  if (/^[#0\.\*x\s]+$/.test(trimmed)) {
    return { skip: true, skipReason: 'Junk data: symbols/zeros only' };
  }

  // SKIP exact values
  const skipExact = [
    'cancelado', 'cancelled', 'canceled', 'duplicado', 'error', 'eliminado',
    'none', 'externo', 'tour', 'visita', 'bailarines', 'fumigadores', 'artesanas', 'artesanos',
    'managers', 'cocineros', 'personal bar', 'personal construccion', 'abogados abogados',
    'nayara staff', 'profe yoga', 'rhomina masajista', 'dj fat', 'gapa', '0', '#error!',
    '****', 'xxx', 'xxxxx', '.', '. .'
  ];

  if (skipExact.includes(trimmed)) {
    return { skip: true, skipReason: `Junk data: "${primaryName}"` };
  }

  // SKIP starts with
  const skipStarts = [
    'cancelado', 'duplicado', 'perfil duplicado', 'usuario duplicado', 'cance',
    'can celdes', 'cancelled', 'cancel'
  ];

  if (skipStarts.some(s => trimmed.startsWith(s))) {
    return { skip: true, skipReason: `Junk data: starts with "${skipStarts.find(s => trimmed.startsWith(s))}"` };
  }

  // Not skipped, infer profile type
  let inferredProfileType: 'guest' | 'staff' | 'visitor' | 'musician' | 'artist' | 'other' = 'guest';

  // musician
  if (trimmed.startsWith('musicos') || trimmed.startsWith('musico y')) {
    inferredProfileType = 'musician';
  }

  // staff
  if (trimmed.includes('chef ') || trimmed.includes('masajista') || trimmed.includes('fotografo') ||
      trimmed.includes('fotografa') || trimmed.includes('maquillista') || trimmed.includes('violinista') ||
      trimmed.includes('guitarrista') || trimmed.includes('musico ')) {
    inferredProfileType = 'staff';
  }

  // visitor
  if (trimmed.includes('site inspection') || trimmed.includes('famtrip') || trimmed.includes('fam trip') ||
      trimmed.includes('press trip') || trimmed.includes('inspeccion agencia') || trimmed.includes('inspeccion municipio') ||
      trimmed.includes('agente') || trimmed.includes('biondi travel') || trimmed.includes('panama journeys') ||
      trimmed.includes('panama trails') || trimmed.includes('ogaya travel')) {
    inferredProfileType = 'visitor';
  }

  // artist
  if (trimmed.includes('artesano')) {
    inferredProfileType = 'artist';
  }

  return { skip: false, inferredProfileType };
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

    // Phase A: Parse all CSV rows (pure JS, no DB calls)
    const parsedRows = lines.slice(1).map(line => {
      const vals = parseCSVLine(line);
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });

      const legacyId = row.id_huesped || '';
      const fullName = row.nombre_completo || '';
      const email = row.email || '';
      let firstName = row.nombre || '';
      let lastName = row.apellido || '';
      let companion = row.acompaante || '';
      const vip = parseInt(row.vip) || 0;

      // Fix A: Strip companion from name before DB lookup
      const primaryName = fullName.includes(' y ') ? fullName.split(' y ')[0].trim() : fullName;

      // Fix B: Derive firstName/lastName if empty
      if (!firstName && !lastName && primaryName) {
        const parts = primaryName.trim().split(/\s+/);
        if (parts.length > 1) {
          firstName = parts.slice(0, -1).join(' ');
          lastName = parts[parts.length - 1];
        } else {
          firstName = primaryName;
          lastName = '';
        }
      }

      // Fix G: Fallback to apellido for derivation if firstName still empty
      // This handles rows where the name was entered in the wrong column (apellido only)
      if (!firstName && lastName) {
        const parts = lastName.trim().split(/\s+/);
        if (parts.length > 1) {
          firstName = parts.slice(0, -1).join(' ');
          lastName = parts[parts.length - 1];
        } else {
          firstName = lastName;
          lastName = '';
        }
      }

      if (fullName.includes(' y ')) {
        companion = fullName.split(' y ')[1].trim();
      }

      return {
        legacyId,
        fullName,
        primaryName,
        email,
        firstName,
        lastName,
        companion,
        vip,
        phone: row.telefono || '',
        nationality: row.pais || '',
        notes: row.notas || '',
        stats: {
          arrivals: row.llegadas || '0',
          nights: row.noches || '0',
          revenue: row.room_revenue || '0'
        }
      };
    }).filter(r => r.fullName || r.legacyId); // skip completely blank rows

    // Phase B: ONE batch query for all rows (excluding SKIP rows)
    // First, classify all rows for junk/profile type
    const classified = parsedRows.map((r, idx) => {
      // Fix H: If firstName is empty after all derivation, skip the row (no valid name data)
      if (!r.firstName) {
        return { row: r, idx, skip: true, skipReason: 'No valid name data — firstName empty after derivation' };
      }

      const classification = classifyRow(r.primaryName, r.legacyId, r.email);
      return { row: r, idx, ...classification };
    });

    const nonSkipRows = classified.filter(c => !c.skip);
    const allLegacyIds = nonSkipRows.map(c => c.row.legacyId).filter(Boolean);
    const allEmails = nonSkipRows.map(c => c.row.email).filter(Boolean);
    // Use primaryName for DB lookup (Fix A)
    const allNames = nonSkipRows.map(c => c.row.primaryName.toLowerCase()).filter(Boolean);

    const existingGuests = (allLegacyIds.length || allEmails.length || allNames.length)
      ? await queryMany(`
          SELECT id, first_name, last_name, full_name, email, legacy_appsheet_id, companion_name
          FROM guests
          WHERE legacy_appsheet_id = ANY($1::text[])
             OR (email = ANY($2::text[]) AND email IS NOT NULL AND email != '')
             OR LOWER(full_name) = ANY($3::text[])
        `, [allLegacyIds, allEmails, allNames])
      : [];

    // Phase C: Build in-memory lookup maps (instant, no DB)
    const byLegacyId = new Map(
      existingGuests.filter(g => g.legacy_appsheet_id).map(g => [g.legacy_appsheet_id, g])
    );
    const byEmail = new Map(
      existingGuests.filter(g => g.email).map(g => [g.email, g])
    );
    const byName = new Map(
      existingGuests.map(g => [g.full_name.toLowerCase(), g])
    );

    // Phase D: Match rows against maps
    const analysis = classified.map((c, rowIndex) => {
      const r = c.row;

      // If this row is SKIP, return early
      if (c.skip) {
        return {
          csv: {
            legacyId: r.legacyId,
            firstName: r.firstName,
            lastName: r.lastName,
            fullName: r.fullName,
            primaryName: r.primaryName,
            email: r.email,
            phone: r.phone,
            nationality: r.nationality,
            companion: r.companion,
            vip: r.vip,
            notes: r.notes,
            stats: r.stats
          },
          match: null,
          action: 'SKIP' as const,
          reason: c.skipReason || 'Junk data',
          inferredProfileType: 'guest' as const,
          multiCompanion: false
        };
      }

      // Check DB match
      let action: 'CREATE' | 'UPDATE' | 'CONFLICT' | 'SKIP' = 'CREATE';
      let reason = 'New Profile';

      const match = byLegacyId.get(r.legacyId)
                 || byEmail.get(r.email)
                 || byName.get(r.primaryName.toLowerCase())
                 || null;

      if (match) {
        if (match.legacy_appsheet_id === r.legacyId || match.email === r.email) {
          action = 'UPDATE';
          reason = 'ID/Email Match';
        } else {
          action = 'CONFLICT';
          reason = 'Similar Name found';
        }
      }

      // Fix F: Check for multi-companion
      const multiCompanion = (r.fullName.match(/ y /g) || []).length > 1;

      return {
        csv: {
          legacyId: r.legacyId,
          firstName: r.firstName,
          lastName: r.lastName,
          fullName: r.fullName,
          primaryName: r.primaryName,
          email: r.email,
          phone: r.phone,
          nationality: r.nationality,
          companion: r.companion,
          vip: r.vip,
          notes: r.notes,
          stats: r.stats
        },
        match: null,
        action,
        reason,
        inferredProfileType: c.inferredProfileType,
        multiCompanion
      };
    });

    // Now add match info back (only for non-SKIP rows)
    const analysisWithMatches = analysis.map((item, idx) => {
      if (item.action === 'SKIP') {
        return item;
      }

      const r = parsedRows[idx];
      const match = byLegacyId.get(r.legacyId)
                 || byEmail.get(r.email)
                 || byName.get(r.primaryName.toLowerCase())
                 || null;

      return {
        ...item,
        match: match ? {
          id: match.id,
          fullName: match.full_name,
          email: match.email,
          legacyId: match.legacy_appsheet_id
        } : null
      };
    });

    return NextResponse.json({
      summary: {
        total: analysis.length,
        create: analysis.filter(a => a.action === 'CREATE').length,
        update: analysis.filter(a => a.action === 'UPDATE').length,
        conflict: analysis.filter(a => a.action === 'CONFLICT').length,
        skip: analysis.filter(a => a.action === 'SKIP').length
      },
      analysis: analysisWithMatches
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
