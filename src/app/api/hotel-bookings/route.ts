import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const hotelsOnly = searchParams.get('hotels');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    if (hotelsOnly === 'true') {
      const hotels = await queryMany('SELECT * FROM partner_hotels WHERE is_active = true ORDER BY name');
      return NextResponse.json({ hotels });
    }

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (filter === 'today') whereClause += ` AND ob.date = CURRENT_DATE`;
    else if (filter === 'upcoming') whereClause += ` AND ob.date >= CURRENT_DATE`;
    else if (filter === 'this_week') whereClause += ` AND ob.date >= CURRENT_DATE AND ob.date < CURRENT_DATE + INTERVAL '7 days'`;
    else if (filter === 'this_month') whereClause += ` AND EXTRACT(MONTH FROM ob.date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM ob.date) = EXTRACT(YEAR FROM CURRENT_DATE)`;

    if (date_from) { whereClause += ` AND ob.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND ob.date <= $${idx++}`; params.push(date_to); }

    const hotel_bookings = await queryMany(
      `SELECT ob.*, g.full_name as guest_name, ph.name as hotel_name
       FROM other_hotel_bookings ob
       LEFT JOIN guests g ON ob.guest_id = g.id
       LEFT JOIN partner_hotels ph ON ob.hotel_id = ph.id
       ${whereClause}
       ORDER BY ob.date DESC LIMIT 200`,
      params
    );

    return NextResponse.json({ hotel_bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const body = await request.json();
    const booking = await queryOne(
      `INSERT INTO other_hotel_bookings (date, guest_id, reservation_id, hotel_id, num_guests, checkin, checkout, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [body.date, body.guest_id || null, body.reservation_id || null, body.hotel_id || null, body.num_guests || 1, body.checkin || null, body.checkout || null, body.notes || null]
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await queryOne('SELECT * FROM other_hotel_bookings WHERE id = $1', [id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowedFields = ['date', 'guest_id', 'hotel_id', 'vendor_id', 'num_guests', 'checkin', 'checkout', 'guest_status', 'vendor_status', 'billed_date', 'paid_date', 'notes'];
    for (const field of allowedFields) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(fields[field]);
        if (existing[field] !== fields[field]) {
          await query(
            `INSERT INTO other_hotel_history (booking_id, changed_by, field, old_value, new_value) VALUES ($1,$2,$3,$4,$5)`,
            [id, user.userId, field, String(existing[field] ?? ''), String(fields[field] ?? '')]
          );
        }
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    params.push(id);
    const booking = await queryOne(`UPDATE other_hotel_bookings SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const booking = await queryOne(
      `UPDATE other_hotel_bookings SET guest_status = 'cancelled' WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
