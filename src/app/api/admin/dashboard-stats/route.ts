import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const [
      arrivals,
      departures,
      inHouse,
      transfers,
      tours,
      requests,
      conversations,
      dinners
    ] = await Promise.all([
      // Arrivals
      queryOne('SELECT COUNT(*) as count FROM reservations WHERE arrival = $1 AND status != $2', [date, 'CANCELLED']),
      // Departures
      queryOne('SELECT COUNT(*) as count FROM reservations WHERE departure = $1 AND status != $2', [date, 'CANCELLED']),
      // In House (Checked in and not yet departed)
      queryOne('SELECT COUNT(*) as count FROM reservations WHERE arrival <= $1 AND departure > $1 AND status = $2', [date, 'CHECKED IN']),
      // Transfers
      queryOne('SELECT COUNT(*) as count FROM transfers WHERE date = $1 AND guest_status != $2', [date, 'cancelled']),
      // Tours
      queryOne(`
        SELECT COUNT(*) as count
        FROM tour_bookings tb
        LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
        WHERE COALESCE(ts.date, tb.activity_date) = $1 AND tb.guest_status != $2
      `, [date, 'cancelled']),
      // Pending Special Requests
      queryOne('SELECT COUNT(*) as count FROM special_requests WHERE status = $1', ['pending']),
      // Open Conversations
      queryOne('SELECT COUNT(*) as count FROM conversations WHERE status != $1', ['resolved']),
      // Romantic Dinners for date
      queryOne('SELECT COUNT(*) as count FROM romantic_dinners WHERE date = $1 AND status != $2', [date, 'cancelled']),
    ]);

    return NextResponse.json({
      arrivals: parseInt(arrivals.count),
      departures: parseInt(departures.count),
      inHouse: parseInt(inHouse.count),
      transfers: parseInt(transfers.count),
      tours: parseInt(tours.count),
      requests: parseInt(requests.count),
      conversations: parseInt(conversations.count),
      dinners: parseInt(dinners.count),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
