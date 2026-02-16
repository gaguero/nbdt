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
      // Find guests with similar names
      // Using a simple self-join on first 4 characters or Soundex if available
      // For now, let's find exact full_name duplicates or very similar ones
      const duplicates = await queryMany(`
        SELECT g1.id as id1, g1.full_name as name1, g1.email as email1, g1.created_at as date1,
               g2.id as id2, g2.full_name as name2, g2.email as email2, g2.created_at as date2
        FROM guests g1
        JOIN guests g2 ON g1.id < g2.id 
          AND (
            g1.full_name ILIKE g2.full_name 
            OR (g1.email = g2.email AND g1.email IS NOT NULL AND g1.email != '')
          )
        ORDER BY g1.full_name ASC
      `);
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
          SELECT id, full_name, email, nationality
          FROM guests
          WHERE full_name ILIKE $1 
             OR last_name ILIKE $2
             OR $3 ILIKE '%' || last_name || '%'
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

    const { action, primaryId, secondaryId, reservationId } = await request.json();

    if (action === 'merge') {
      if (!primaryId || !secondaryId) return NextResponse.json({ error: 'Both IDs required' }, { status: 400 });

      await transaction(async (client) => {
        // 1. Move all reservations
        await client.query('UPDATE reservations SET guest_id = $1 WHERE guest_id = $2', [primaryId, secondaryId]);
        // 2. Move all transfers
        await client.query('UPDATE transfers SET guest_id = $1 WHERE guest_id = $2', [primaryId, secondaryId]);
        // 3. Move all tour bookings
        await client.query('UPDATE tour_bookings SET guest_id = $1 WHERE guest_id = $2', [primaryId, secondaryId]);
        // 4. Move all special requests
        await client.query('UPDATE special_requests SET guest_id = $1 WHERE guest_id = $2', [primaryId, secondaryId]);
        // 5. Move all romantic dinners
        await client.query('UPDATE romantic_dinners SET guest_id = $1 WHERE guest_id = $2', [primaryId, secondaryId]);
        // 6. Move all messages
        await client.query('UPDATE conversations SET guest_id = $1 WHERE guest_id = $2', [primaryId, secondaryId]);
        // 7. Delete secondary guest
        await client.query('DELETE FROM guests WHERE id = $2', [primaryId, secondaryId]);
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
