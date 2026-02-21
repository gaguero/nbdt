import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query, transaction } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'tours:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const product_id = searchParams.get('product_id');
    const vendor_id_param = searchParams.get('vendor_id');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (product_id) { whereClause += ` AND tb.product_id = $${idx++}`; params.push(product_id); }

    // If an explicit vendor_id filter is passed, apply it
    if (vendor_id_param) { whereClause += ` AND tp.vendor_id = $${idx++}`; params.push(vendor_id_param); }

    if (filter === 'today') whereClause += ` AND COALESCE(ts.date, tb.activity_date) = CURRENT_DATE`;
    else if (filter === 'upcoming') whereClause += ` AND COALESCE(ts.date, tb.activity_date) >= CURRENT_DATE`;
    if (date_from) { whereClause += ` AND COALESCE(ts.date, tb.activity_date) >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND COALESCE(ts.date, tb.activity_date) <= $${idx++}`; params.push(date_to); }

    const tour_bookings = await queryMany(
      `SELECT tb.*, g.full_name as guest_name, tp.name_en, tp.name_es,
              COALESCE(ts.date, tb.activity_date) as schedule_date,
              COALESCE(ts.start_time, tb.start_time) as start_time,
              tp.vendor_id,
              v.name as vendor_name,
              lv.name AS legacy_vendor_name
       FROM tour_bookings tb
       LEFT JOIN guests g ON tb.guest_id = g.id
       LEFT JOIN tour_products tp ON tb.product_id = tp.id
       LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
       LEFT JOIN vendors v ON tp.vendor_id = v.id
       LEFT JOIN vendors lv ON lv.legacy_appsheet_id = tb.legacy_vendor_id
       ${whereClause}
       ORDER BY COALESCE(ts.date, tb.activity_date) ASC, COALESCE(ts.start_time, tb.start_time) ASC
       LIMIT 200`,
      params
    );

    return NextResponse.json({ tour_bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'tours:create');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const booking = await transaction(async (client) => {
      if (body.schedule_id) {
        const schedule = await client.query(
          'SELECT * FROM tour_schedules WHERE id = $1', [body.schedule_id]
        );
        if (schedule.rows.length === 0) throw new Error('Schedule not found');
        const sched = schedule.rows[0];
        if (!sched.is_available) throw new Error('Schedule not available');
        if (sched.capacity_remaining !== null && sched.capacity_remaining < (body.num_guests || 1)) {
          throw new Error('Not enough capacity');
        }
        if (sched.capacity_remaining !== null) {
          await client.query(
            'UPDATE tour_schedules SET capacity_remaining = capacity_remaining - $1 WHERE id = $2',
            [body.num_guests || 1, body.schedule_id]
          );
        }
      }

      const result = await client.query(
        `INSERT INTO tour_bookings (
          schedule_id, product_id, guest_id, reservation_id,
          booking_mode, num_guests, total_price, special_requests
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          body.schedule_id || null, body.product_id, body.guest_id || null,
          body.reservation_id || null, body.booking_mode || 'shared',
          body.num_guests || 1, body.total_price || null, body.special_requests || null,
        ]
      );

      return result.rows[0];
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'tours:update');
    const isStaff = !(auth instanceof NextResponse);
    
    // Fallback: check if vendor
    if (!isStaff) {
      const vendorToken = request.cookies.get('nayara_vendor_token')?.value;
      if (!vendorToken) return auth;
    }

    const userId = (auth as any).userId || 'vendor';
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await queryOne('SELECT * FROM tour_bookings WHERE id = $1', [id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    // Vendors can only update vendor_status; staff can update all
    const vendorOnlyFields = ['vendor_status'];
    const staffFields = ['guest_status', 'vendor_status', 'billed_date', 'paid_date', 'special_requests', 'num_guests', 'total_price'];
    const allowedFields = isStaff ? staffFields : vendorOnlyFields;

    for (const field of allowedFields) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(fields[field]);
        if (existing[field] !== fields[field]) {
          await query(
            `INSERT INTO tour_booking_history (booking_id, changed_by, field, old_value, new_value)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, userId, field, String(existing[field] ?? ''), String(fields[field] ?? '')]
          );
        }
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const booking = await queryOne(
      `UPDATE tour_bookings SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    const hydratedBooking = await queryOne(
      `SELECT tb.*, g.full_name as guest_name, tp.name_en, tp.name_es,
              COALESCE(ts.date, tb.activity_date) as schedule_date,
              COALESCE(ts.start_time, tb.start_time) as start_time,
              tp.vendor_id,
              v.name as vendor_name,
              lv.name AS legacy_vendor_name
       FROM tour_bookings tb
       LEFT JOIN guests g ON tb.guest_id = g.id
       LEFT JOIN tour_products tp ON tb.product_id = tp.id
       LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
       LEFT JOIN vendors v ON tp.vendor_id = v.id
       LEFT JOIN vendors lv ON lv.legacy_appsheet_id = tb.legacy_vendor_id
       WHERE tb.id = $1`,
      [booking.id]
    );

    return NextResponse.json({ booking: hydratedBooking ?? booking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'tours:delete');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const booking = await queryOne('SELECT schedule_id, num_guests FROM tour_bookings WHERE id = $1', [id]);
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await queryOne(`UPDATE tour_bookings SET guest_status = 'cancelled' WHERE id = $1 RETURNING id`, [id]);

    if (booking.schedule_id) {
      await query(
        `UPDATE tour_schedules SET capacity_remaining = capacity_remaining + $1 WHERE id = $2`,
        [booking.num_guests || 1, booking.schedule_id]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
