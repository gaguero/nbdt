import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;
    if (filter === 'today') whereClause += ` AND rd.date = CURRENT_DATE`;
    else if (filter === 'upcoming') whereClause += ` AND rd.date >= CURRENT_DATE`;
    if (date_from) { whereClause += ` AND rd.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND rd.date <= $${idx++}`; params.push(date_to); }

    const romantic_dinners = await queryMany(
      `SELECT rd.*, g.full_name as guest_name, v.name as vendor_name
       FROM romantic_dinners rd
       LEFT JOIN guests g ON rd.guest_id = g.id
       LEFT JOIN vendors v ON rd.vendor_id = v.id
       ${whereClause}
       ORDER BY rd.date ASC, rd.time ASC LIMIT 200`,
      params
    );

    return NextResponse.json({ romantic_dinners });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const dinner = await queryOne(
      `INSERT INTO romantic_dinners (date, time, guest_id, reservation_id, num_guests, location, status, notes, vendor_id, billed_date, paid_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [body.date, body.time, body.guest_id, body.reservation_id, body.num_guests || 2, body.location, body.status || 'pending', body.notes, body.vendor_id || null, body.billed_date || null, body.paid_date || null]
    );

    return NextResponse.json({ dinner }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowedFields = ['date', 'time', 'guest_id', 'num_guests', 'location', 'status', 'notes', 'vendor_id', 'billed_date', 'paid_date'];
    for (const field of allowedFields) {
      if (field in fields) { setClauses.push(`${field} = $${idx++}`); params.push(fields[field]); }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    params.push(id);
    const dinner = await queryOne(`UPDATE romantic_dinners SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    return NextResponse.json({ dinner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:manage');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const dinner = await queryOne(
      `UPDATE romantic_dinners SET status = 'cancelled' WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!dinner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
