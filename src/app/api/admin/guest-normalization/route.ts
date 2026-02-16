import { NextRequest, NextResponse } from 'next/server';
import { query, queryMany, transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * GET /api/admin/guest-normalization
 * Scans for potential duplicates and unlinked reservations.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'duplicates';

    if (mode === 'duplicates') {
      // Find clusters of guests with the same name or email
      const clusters = await queryMany(`
        SELECT full_name, email, COUNT(*) as count
        FROM guests
        GROUP BY full_name, email
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `);

      const duplicates = await Promise.all(clusters.map(async (cluster) => {
        const members = await queryMany(`
          SELECT g.*,
            (SELECT json_agg(json_build_object(
              'id', r.id, 
              'type', 'reservation',
              'info', 'Room ' || COALESCE(r.room, '?') || ' (' || r.arrival || ')',
              'full_detail', json_build_object(
                'Status', r.status,
                'Arrival', r.arrival,
                'Departure', r.departure,
                'Nights', r.nights,
                'Persons', r.persons,
                'Category', r.room_category,
                'Rate Code', r.rate_code,
                'Opera ID', r.opera_resv_id
              )
            )) FROM reservations r WHERE r.guest_id = g.id) as res_list,
            
            (SELECT json_agg(json_build_object(
              'id', t.id,
              'type', 'transfer',
              'info', t.date || ' ' || COALESCE(t.origin, '?') || ' -> ' || COALESCE(t.destination, '?'),
              'full_detail', json_build_object(
                'Date', t.date,
                'Time', t.time,
                'Origin', t.origin,
                'Destination', t.destination,
                'Passengers', t.num_passengers,
                'Flight', t.flight_number,
                'Status', t.guest_status,
                'Notes', t.notes
              )
            )) FROM transfers t WHERE t.guest_id = g.id) as trans_list,
            
            (SELECT json_agg(json_build_object(
              'id', tb.id,
              'type', 'tour',
              'info', COALESCE(tb.created_at::date::text, 'No Date') || ': ' || tp.name_en || ' (' || tb.num_guests || ' pax)',
              'full_detail', json_build_object(
                'Product', tp.name_en,
                'Mode', tb.booking_mode,
                'Guests', tb.num_guests,
                'Total Price', tb.total_price,
                'Status', tb.guest_status,
                'Notes', tb.notes,
                'Requests', tb.special_requests
              )
            )) FROM tour_bookings tb LEFT JOIN tour_products tp ON tb.product_id = tp.id WHERE tb.guest_id = g.id) as tour_list,
            
            (SELECT json_agg(json_build_object(
              'id', sr.id,
              'type', 'request',
              'info', sr.date || ': ' || sr.request,
              'full_detail', json_build_object(
                'Date', sr.date,
                'Department', sr.department,
                'Status', sr.status,
                'Request', sr.request,
                'Notes', sr.notes
              )
            )) FROM special_requests sr WHERE sr.guest_id = g.id) as req_list
          FROM guests g
          WHERE full_name = $1 AND (email = $2::text OR (email IS NULL AND $2::text IS NULL))
          ORDER BY created_at ASC
        `, [cluster.full_name, cluster.email]);
        return { name: cluster.full_name, email: cluster.email, members };
      }));

      return NextResponse.json({ duplicates });
    }

    if (mode === 'orphans') {
      // Find reservations that are not linked to a guest OR where names mismatch
      const orphans = await queryMany(`
        SELECT r.id, r.opera_resv_id, r.opera_guest_name, r.room, r.arrival, r.guest_id, g.full_name as linked_guest_name
        FROM reservations r
        LEFT JOIN guests g ON r.guest_id = g.id
        WHERE r.guest_id IS NULL 
           OR (g.full_name IS NOT NULL AND r.opera_guest_name NOT ILIKE '%' || g.last_name || '%')
        ORDER BY r.arrival DESC
        LIMIT 50
      `);

      // For each orphan, find potential suggested guests
      const orphansWithSuggestions = await Promise.all(orphans.map(async (orphan) => {
        const operaName = orphan.opera_guest_name || '';
        const lastName = operaName.split(',')[0].trim();
        
        const suggestions = await queryMany(`
          SELECT g.id, g.full_name, g.email, g.nationality,
            (SELECT COUNT(*) FROM reservations WHERE guest_id = g.id) as res_count,
            (SELECT COUNT(*) FROM transfers WHERE guest_id = g.id) as trans_count
          FROM guests g
          WHERE g.full_name ILIKE $1 
             OR g.last_name ILIKE $2
             OR $3 ILIKE '%' || g.last_name || '%'
          LIMIT 3
        `, [`%${lastName}%`, lastName, operaName]);

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
 * Executes merge or link actions.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, primaryId, secondaryId, reservationId, guestId } = await request.json();

    if (action === 'delete') {
      if (!guestId) return NextResponse.json({ error: 'Guest ID required' }, { status: 400 });
      await query('DELETE FROM guests WHERE id = $1::uuid', [guestId]);
      return NextResponse.json({ success: true, message: 'Guest deleted successfully' });
    }

    if (action === 'merge') {
      if (!primaryId || !secondaryId) return NextResponse.json({ error: 'Both IDs required' }, { status: 400 });

      await transaction(async (client) => {
        // 1. Move all reservations
        await client.query('UPDATE reservations SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        // 2. Move all transfers
        await client.query('UPDATE transfers SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        // 3. Move all tour bookings
        await client.query('UPDATE tour_bookings SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        // 4. Move all special requests
        await client.query('UPDATE special_requests SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        // 5. Move all romantic dinners
        await client.query('UPDATE romantic_dinners SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        // 6. Move all messages
        await client.query('UPDATE conversations SET guest_id = $1::uuid WHERE guest_id = $2::uuid', [primaryId, secondaryId]);
        // 7. Delete secondary guest
        await client.query('DELETE FROM guests WHERE id = $1::uuid', [secondaryId]);
      });

      return NextResponse.json({ success: true, message: 'Guests merged successfully' });
    }

    if (action === 'link') {
      if (!reservationId || !primaryId) return NextResponse.json({ error: 'Reservation and Guest IDs required' }, { status: 400 });

      await query('UPDATE reservations SET guest_id = $1 WHERE id = $2', [primaryId, reservationId]);
      return NextResponse.json({ success: true, message: 'Reservation linked successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
