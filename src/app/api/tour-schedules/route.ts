import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Public: guests and staff can view schedules
    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');
    const date = searchParams.get('date');
    const from_date = searchParams.get('from_date');
    const available = searchParams.get('available');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (product_id) { whereClause += ` AND ts.product_id = $${idx++}`; params.push(product_id); }
    if (date) { whereClause += ` AND ts.date = $${idx++}`; params.push(date); }
    if (from_date) { whereClause += ` AND ts.date >= $${idx++}`; params.push(from_date); }
    else if (!date) { whereClause += ` AND ts.date >= CURRENT_DATE`; }
    if (available === 'true') { whereClause += ` AND ts.is_available = true AND ts.capacity_remaining > 0`; }

    const tour_schedules = await queryMany(
      `SELECT ts.*, tp.name_en as product_name
       FROM tour_schedules ts
       LEFT JOIN tour_products tp ON ts.product_id = tp.id
       ${whereClause}
       ORDER BY ts.date, ts.start_time`,
      params
    );

    return NextResponse.json({ tour_schedules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (body.recurring) {
      const { product_id, start_time, end_time, days_of_week, from_date, to_date, capacity } = body;
      const schedules = [];
      const start = new Date(from_date);
      const end = new Date(to_date);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (days_of_week.includes(d.getDay())) {
          const dateStr = d.toISOString().split('T')[0];
          const schedule = await queryOne(
            `INSERT INTO tour_schedules (product_id, date, start_time, end_time, capacity_remaining, is_available)
             VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
            [product_id, dateStr, start_time, end_time, capacity]
          );
          schedules.push(schedule);
        }
      }
      return NextResponse.json({ schedules }, { status: 201 });
    }

    const schedule = await queryOne(
      `INSERT INTO tour_schedules (product_id, date, start_time, end_time, capacity_remaining, is_available, override_price, notes_internal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [body.product_id, body.date, body.start_time, body.end_time, body.capacity_remaining, body.is_available !== false, body.override_price, body.notes_internal]
    );

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const allowed = ['is_available', 'capacity_remaining', 'override_price', 'notes_internal', 'start_time', 'end_time'];
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const field of allowed) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(fields[field]);
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const schedule = await queryOne(
      `UPDATE tour_schedules SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return NextResponse.json({ schedule });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
