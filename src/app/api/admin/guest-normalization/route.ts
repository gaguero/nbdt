import { NextRequest, NextResponse } from 'next/server';
import { query, queryMany, transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * GET /api/admin/guest-normalization
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'duplicates';

    if (mode === 'duplicates') {
      const clusters = await queryMany(`
        WITH normalized_guests AS (
          SELECT id, full_name, email,
            (SELECT string_agg(ch, '') FROM (SELECT unnest(string_to_array(LOWER(REPLACE(REPLACE(full_name, ' ', ''), ',', '')), NULL)) as ch ORDER BY ch) s) as fingerprint
          FROM guests
        )
        SELECT fingerprint, email, COUNT(*) as count FROM normalized_guests GROUP BY fingerprint, email HAVING COUNT(*) > 1 ORDER BY count DESC
      `);

      const duplicates = await Promise.all(clusters.map(async (cluster) => {
        const members = await queryMany(`
          SELECT g.*,
            (SELECT json_agg(json_build_object('id', r.id, 'type', 'reservation', 'info', 'Room ' || COALESCE(r.room, '?') || ' (' || r.arrival || ')', 'full_detail', json_build_object('Status', r.status, 'Arrival', r.arrival, 'Opera ID', r.opera_resv_id))) FROM reservations r WHERE r.guest_id = g.id) as res_list,
            (SELECT json_agg(json_build_object('id', t.id, 'type', 'transfer', 'info', t.date || ' ' || COALESCE(t.origin, '?') || ' -> ' || COALESCE(t.destination, '?'), 'full_detail', json_build_object('Date', t.date, 'Origin', t.origin, 'Status', t.guest_status))) FROM transfers t WHERE t.guest_id = g.id) as trans_list,
            (SELECT json_agg(json_build_object('id', tb.id, 'type', 'tour', 'info', COALESCE(tb.created_at::date::text, 'No Date') || ': ' || tp.name_en, 'full_detail', json_build_object('Product', tp.name_en, 'Guests', tb.num_guests, 'Status', tb.guest_status))) FROM tour_bookings tb LEFT JOIN tour_products tp ON tb.product_id = tp.id WHERE tb.guest_id = g.id) as tour_list,
            (SELECT json_agg(json_build_object('id', sr.id, 'type', 'request', 'info', sr.date || ': ' || sr.request, 'full_detail', json_build_object('Date', sr.date, 'Request', sr.request, 'Status', sr.status))) FROM special_requests sr WHERE sr.guest_id = g.id) as req_list
          FROM guests g
          WHERE (SELECT string_agg(ch, '') FROM (SELECT unnest(string_to_array(LOWER(REPLACE(REPLACE(g.full_name, ' ', ''), ',', '')), NULL)) as ch ORDER BY ch) s) = $1 
          AND (email = $2::text OR (email IS NULL AND $2 IS NULL))
        `, [cluster.fingerprint, cluster.email]);

        const rankedMembers = members.map(m => {
          const resCount = m.res_list?.length || 0;
          const otherCount = (m.trans_list?.length || 0) + (m.tour_list?.length || 0) + (m.req_list?.length || 0);
          return { ...m, weight: (resCount * 100) + otherCount, total_records: resCount + otherCount };
        }).sort((a, b) => b.weight - a.weight);

        return { name: rankedMembers[0].full_name, email: cluster.email, members: rankedMembers };
      }));
      return NextResponse.json({ duplicates });
    }

    if (mode === 'orphans') {
      const orphans = await queryMany(`
        SELECT r.id, r.opera_resv_id, r.opera_guest_name, r.room, r.arrival, r.guest_id, g.full_name as linked_guest_name
        FROM reservations r
        LEFT JOIN guests g ON r.guest_id = g.id
        WHERE r.guest_id IS NULL 
           OR (g.full_name IS NOT NULL AND LOWER(REPLACE(r.opera_guest_name, ',', '')) NOT ILIKE '%' || LOWER(REPLACE(g.last_name, ' ', '')) || '%')
        ORDER BY r.arrival DESC LIMIT 50
      `);

      const orphansWithSuggestions = await Promise.all(orphans.map(async (orphan) => {
        const lastName = (orphan.opera_guest_name || '').split(',')[0].trim();
        const suggestions = await queryMany(`
          SELECT g.id, g.full_name, g.email, (SELECT COUNT(*) FROM reservations WHERE guest_id = g.id) as res_count
          FROM guests g WHERE g.full_name ILIKE $1 OR g.last_name ILIKE $2 LIMIT 3
        `, [`%${lastName}%`, lastName]);
        return { ...orphan, suggestions };
      }));
      return NextResponse.json({ orphans: orphansWithSuggestions });
    }
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/guest-normalization
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { action, primaryId, secondaryId, reservationId, guestId } = await request.json();

    if (action === 'delete') {
      await query('DELETE FROM guests WHERE id = $1::uuid', [guestId]);
      return NextResponse.json({ success: true });
    }

    if (action === 'merge') {
      await transaction(async (client) => {
        // 1. Read secondary guest data
        const secondaryData = await client.query(
          'SELECT id, first_name, last_name, email, legacy_appsheet_id, profile_type, created_at FROM guests WHERE id = $1::uuid',
          [secondaryId]
        );
        const secondary = secondaryData.rows[0];

        // 2. Append to primary's legacy_profiles
        await client.query(`
          UPDATE guests
          SET legacy_profiles = legacy_profiles || jsonb_build_array(
            jsonb_build_object(
              'id', $1::text,
              'first_name', $2,
              'last_name', $3,
              'email', $4,
              'legacy_appsheet_id', $5,
              'profile_type', $6,
              'merged_at', NOW()::text
            )
          )
          WHERE id = $7::uuid
        `, [secondary.id, secondary.first_name, secondary.last_name, secondary.email, secondary.legacy_appsheet_id, secondary.profile_type, primaryId]);

        // 3. Reassign FKs
        await client.query('UPDATE reservations SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        await client.query('UPDATE transfers SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        await client.query('UPDATE tour_bookings SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        await client.query('UPDATE special_requests SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        await client.query('UPDATE romantic_dinners SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);

        // 4. Delete secondary
        await client.query('DELETE FROM guests WHERE id = $1::uuid', [secondaryId]);
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'link') {
      await query('UPDATE reservations SET guest_id = $1::uuid WHERE id = $2::uuid', [primaryId, reservationId]);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
