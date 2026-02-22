import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * GET /api/search?q=<query>
 *
 * Searches across guests, reservations, and transfers.
 * Returns up to 5 results per category, grouped by type.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const pattern = `%${q}%`;

    const [guests, reservations, transfers] = await Promise.all([
      // Search guests by name, email, phone
      queryMany(
        `SELECT g.id, g.full_name, g.email, g.phone, g.nationality
         FROM guests g
         WHERE g.full_name ILIKE $1
            OR g.email ILIKE $1
            OR g.phone ILIKE $1
         ORDER BY g.full_name ASC
         LIMIT 5`,
        [pattern]
      ),

      // Search reservations by guest name, room
      queryMany(
        `SELECT r.id, r.room, r.arrival, r.departure, r.status,
                COALESCE(g.full_name, r.opera_guest_name) AS guest_name
         FROM reservations r
         LEFT JOIN guests g ON r.guest_id = g.id
         WHERE r.status != 'CANCELLED'
           AND (g.full_name ILIKE $1
                OR r.opera_guest_name ILIKE $1
                OR r.room ILIKE $1)
         ORDER BY r.arrival DESC
         LIMIT 5`,
        [pattern]
      ),

      // Search transfers by guest name, origin, destination
      queryMany(
        `SELECT t.id, t.date, t.time, t.origin, t.destination,
                t.transfer_type, t.guest_status,
                g.full_name AS guest_name
         FROM transfers t
         LEFT JOIN guests g ON t.guest_id = g.id
         WHERE t.guest_status != 'cancelled'
           AND (g.full_name ILIKE $1
                OR t.origin ILIKE $1
                OR t.destination ILIKE $1)
         ORDER BY t.date DESC
         LIMIT 5`,
        [pattern]
      ),
    ]);

    const results = [
      ...guests.map((g: any) => ({
        type: 'guest' as const,
        id: g.id,
        title: g.full_name || '—',
        subtitle: [g.email, g.phone, g.nationality].filter(Boolean).join(' · '),
      })),
      ...reservations.map((r: any) => ({
        type: 'reservation' as const,
        id: r.id,
        title: r.guest_name || '—',
        subtitle: [r.room, r.status, r.arrival?.toString?.()?.split?.('T')?.[0]].filter(Boolean).join(' · '),
      })),
      ...transfers.map((t: any) => ({
        type: 'transfer' as const,
        id: t.id,
        title: t.guest_name || '—',
        subtitle: [t.transfer_type, `${t.origin || ''} → ${t.destination || ''}`, t.date?.toString?.()?.split?.('T')?.[0]].filter(Boolean).join(' · '),
      })),
    ];

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
