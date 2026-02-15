import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query, transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { verifyTokenEdge } from '@/lib/jwt-edge';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const product_id = searchParams.get('product_id');
    const vendor_id_param = searchParams.get('vendor_id');

    // Auth: accept staff token or vendor token
    const staffToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const vendorToken = request.cookies.get('nayara_vendor_token')?.value;

    let autoVendorId: string | null = null;

    if (staffToken) {
      verifyToken(staffToken);
    } else if (vendorToken) {
      const payload = await verifyTokenEdge(vendorToken);
      // When vendor is logged in, restrict to their vendor ID
      autoVendorId = payload.propertyId;
    } else {
      // Allow public access (guest booking)
    }

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (product_id) { whereClause += ` AND tb.product_id = $${idx++}`; params.push(product_id); }

    // vendor filter: explicit param or auto from vendor token
    const effectiveVendorId = autoVendorId || vendor_id_param;
    if (effectiveVendorId) { whereClause += ` AND tp.vendor_id = $${idx++}`; params.push(effectiveVendorId); }

    if (filter === 'today') whereClause += ` AND ts.date = CURRENT_DATE`;
    else if (filter === 'upcoming') whereClause += ` AND ts.date >= CURRENT_DATE`;
    if (date_from) { whereClause += ` AND (ts.date >= $${idx++} OR (ts.date IS NULL AND tb.created_at::date >= $${idx - 1}))`; params.push(date_from); }
    if (date_to) { whereClause += ` AND (ts.date <= $${idx++} OR ts.date IS NULL)`; params.push(date_to); }

    const tour_bookings = await queryMany(
      `SELECT tb.*, g.full_name as guest_name, tp.name_en, tp.name_es,
              ts.date as schedule_date, ts.start_time, tp.vendor_id,
              v.name as vendor_name
       FROM tour_bookings tb
       LEFT JOIN guests g ON tb.guest_id = g.id
       LEFT JOIN tour_products tp ON tb.product_id = tp.id
       LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
       LEFT JOIN vendors v ON tp.vendor_id = v.id
       ${whereClause}
       ORDER BY COALESCE(ts.date, tb.created_at::date) ASC, ts.start_time ASC
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
    // POST is public — guests, staff, and vendors can create bookings
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
    // Accept staff or vendor token
    const staffToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const vendorToken = request.cookies.get('nayara_vendor_token')?.value;

    let userId = 'vendor';
    if (staffToken) {
      const user = verifyToken(staffToken);
      userId = user.userId;
    } else if (vendorToken) {
      await verifyTokenEdge(vendorToken);
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const allowedFields = staffToken ? staffFields : vendorOnlyFields;

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

    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
