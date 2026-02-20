import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const filter = searchParams.get('filter');
    const date = searchParams.get('date');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      whereClause += ` AND r.status = $${paramIdx++}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (g.full_name ILIKE $${paramIdx} OR r.room ILIKE $${paramIdx} OR r.opera_guest_name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (filter === 'arriving_today' || filter === 'arrivals') {
      if (date) {
        whereClause += ` AND r.arrival = $${paramIdx++}`;
        params.push(date);
      } else {
        whereClause += ` AND r.arrival = CURRENT_DATE`;
      }
    } else if (filter === 'departing_today' || filter === 'departures') {
      if (date) {
        whereClause += ` AND r.departure = $${paramIdx++}`;
        params.push(date);
      } else {
        whereClause += ` AND r.departure = CURRENT_DATE`;
      }
    } else if (filter === 'checked_in') {
      // If date provided, find who was in house on THAT date
      if (date) {
        whereClause += ` AND r.arrival <= $${paramIdx} AND r.departure > $${paramIdx}`;
        params.push(date);
        paramIdx++;
      } else {
        whereClause += ` AND r.status = 'CHECKED IN'`;
      }
    }

    const reservations = await queryMany(
      `SELECT r.*, g.full_name as guest_name, g.first_name, g.last_name, g.nationality, r.opera_guest_name,
              EXISTS (SELECT 1 FROM transfers t WHERE t.guest_id = r.guest_id AND t.guest_status != 'cancelled') as transfer_booked,
              EXISTS (SELECT 1 FROM tour_bookings tb WHERE tb.guest_id = r.guest_id AND tb.guest_status != 'cancelled') as tour_booked
       FROM reservations r
       LEFT JOIN guests g ON r.guest_id = g.id
       ${whereClause}
       ORDER BY r.arrival DESC
       LIMIT 200`,
      params
    );

    return NextResponse.json({ reservations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
