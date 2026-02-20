import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const countOnly = searchParams.get('count') === 'true';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (filter === 'today') whereClause += ` AND sr.date = CURRENT_DATE`;
    if (status) { whereClause += ` AND sr.status = ${idx++}`; params.push(status); }
    if (department && department !== 'all') { whereClause += ` AND sr.department = ${idx++}`; params.push(department); }

    if (countOnly) {
      const result = await queryOne(
        `SELECT COUNT(*) as count FROM special_requests sr ${whereClause}`,
        params
      );
      return NextResponse.json({ count: parseInt(result.count) });
    }

    const special_requests = await queryMany(
      `SELECT sr.*, g.full_name as guest_name,
              su.first_name || ' ' || su.last_name as assigned_to_name
       FROM special_requests sr
       LEFT JOIN guests g ON sr.guest_id = g.id
       LEFT JOIN staff_users su ON sr.assigned_to = su.id
       ${whereClause}
       ORDER BY sr.date DESC, sr.time DESC LIMIT 200`,
      params
    );

    return NextResponse.json({ special_requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'reservations:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const result = await queryOne(
      `INSERT INTO special_requests (date, time, guest_id, reservation_id, request, department, status, check_in, check_out, notes, priority, assigned_to, internal_notes)
       VALUES (,$2,$3,$4,$5,$6,$7,$8,$9,0,1,2,3) RETURNING *`,
      [body.date, body.time, body.guest_id, body.reservation_id, body.request, body.department, body.status || 'pending', body.check_in, body.check_out, body.notes, body.priority || 'normal', body.assigned_to || null, body.internal_notes || null]
    );

    return NextResponse.json({ request: result }, { status: 201 });
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

    const allowedFields = ['date', 'time', 'guest_id', 'request', 'department', 'status', 'check_in', 'check_out', 'notes', 'priority', 'assigned_to', 'internal_notes'];
    for (const field of allowedFields) {
      if (field in fields) { setClauses.push(`${field} = ${idx++}`); params.push(fields[field]); }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    params.push(id);
    const result = await queryOne(`UPDATE special_requests SET ${setClauses.join(', ')} WHERE id = ${idx} RETURNING *`, params);

    return NextResponse.json({ request: result });
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

    const result = await queryOne(
      `UPDATE special_requests SET status = 'resolved' WHERE id =  RETURNING id`,
      [id]
    );
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
