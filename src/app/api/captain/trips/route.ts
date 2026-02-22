import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today';

    let dateFilter = '';
    if (filter === 'today') dateFilter = 'AND fa.date = CURRENT_DATE';
    else if (filter === 'upcoming') dateFilter = 'AND fa.date >= CURRENT_DATE';
    else if (filter === 'week') dateFilter = 'AND fa.date >= CURRENT_DATE AND fa.date < CURRENT_DATE + interval \'7 days\'';

    const trips = await queryMany(
      `SELECT fa.*,
              b.name as boat_name, b.type as boat_type, b.capacity as boat_capacity,
              tp.name_en as tour_name_en, tp.name_es as tour_name_es,
              tp.duration_minutes, tp.meeting_point_en, tp.meeting_point_es,
              tp.location as tour_location,
              ts.date as schedule_date,
              t_transfer.origin as transfer_origin, t_transfer.destination as transfer_destination,
              t_transfer.num_passengers,
              g_tour.full_name as tour_guest_name,
              g_transfer.full_name as transfer_guest_name,
              (SELECT COUNT(*) FROM tour_bookings tb
               WHERE tb.schedule_id = fa.tour_schedule_id AND tb.guest_status != 'cancelled') as tour_pax_count,
              (SELECT json_agg(json_build_object('name', g2.full_name, 'num_guests', tb2.num_guests))
               FROM tour_bookings tb2
               LEFT JOIN guests g2 ON tb2.guest_id = g2.id
               WHERE tb2.schedule_id = fa.tour_schedule_id AND tb2.guest_status != 'cancelled') as tour_passengers
       FROM fleet_assignments fa
       LEFT JOIN boats b ON fa.boat_id = b.id
       LEFT JOIN tour_schedules ts ON fa.tour_schedule_id = ts.id
       LEFT JOIN tour_products tp ON ts.product_id = tp.id
       LEFT JOIN transfers t_transfer ON fa.transfer_id = t_transfer.id
       LEFT JOIN guests g_tour ON g_tour.id = (SELECT guest_id FROM tour_bookings WHERE schedule_id = fa.tour_schedule_id LIMIT 1)
       LEFT JOIN guests g_transfer ON t_transfer.guest_id = g_transfer.id
       WHERE fa.captain_id = $1 AND fa.status != 'cancelled' ${dateFilter}
       ORDER BY fa.date, fa.start_time`,
      [decoded.userId]
    );

    return NextResponse.json({ trips });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) return NextResponse.json({ error: 'ID and status required' }, { status: 400 });

    const validStatuses = ['departed', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify this assignment belongs to the captain
    const existing = await queryOne(
      'SELECT * FROM fleet_assignments WHERE id = $1 AND captain_id = $2',
      [id, decoded.userId]
    );
    if (!existing) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const assignment = await queryOne(
      `UPDATE fleet_assignments SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    return NextResponse.json({ assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
