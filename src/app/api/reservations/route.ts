import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const filter = searchParams.get('filter');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      whereClause += ` AND r.status = $${paramIdx++}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (g.full_name ILIKE $${paramIdx} OR r.room ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (filter === 'arriving_today') {
      whereClause += ` AND r.arrival = CURRENT_DATE`;
    } else if (filter === 'departing_today') {
      whereClause += ` AND r.departure = CURRENT_DATE`;
    } else if (filter === 'checked_in') {
      whereClause += ` AND r.status = 'CHECKED IN'`;
    }

    const reservations = await queryMany(
      `SELECT r.*, g.full_name as guest_name, g.first_name, g.last_name, r.opera_guest_name
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
