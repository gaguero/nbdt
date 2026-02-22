import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query, transaction } from '@/lib/db';
import { protectGuestRoute } from '@/lib/guest-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectGuestRoute(request);
    if (auth instanceof NextResponse) return auth;

    const bookings = await queryMany(
      `SELECT tb.*, tp.name_en, tp.name_es, tp.type, tp.duration_minutes,
              tp.location, tp.meeting_point_en, tp.meeting_point_es,
              COALESCE(ts.date, tb.activity_date) as schedule_date,
              COALESCE(ts.start_time, tb.start_time) as start_time,
              v.name as vendor_name
       FROM tour_bookings tb
       LEFT JOIN tour_products tp ON tb.product_id = tp.id
       LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
       LEFT JOIN vendors v ON tp.vendor_id = v.id
       WHERE tb.guest_id = $1
       ORDER BY COALESCE(ts.date, tb.activity_date) DESC
       LIMIT 50`,
      [auth.guestId]
    );

    return NextResponse.json({ bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectGuestRoute(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const booking = await transaction(async (client) => {
      if (body.schedule_id) {
        const schedule = await client.query(
          'SELECT * FROM tour_schedules WHERE id = $1',
          [body.schedule_id]
        );
        if (schedule.rows.length === 0) throw new Error('Schedule not found');
        const sched = schedule.rows[0];
        if (!sched.is_available) throw new Error('Schedule not available');
        if (sched.capacity_remaining !== null && sched.capacity_remaining < (body.num_guests || 1)) {
          throw new Error('Not enough capacity for this slot');
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
          booking_mode, num_guests, special_requests, guest_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
        [
          body.schedule_id || null,
          body.product_id,
          auth.guestId,
          auth.reservationId,
          body.booking_mode || 'shared',
          body.num_guests || 1,
          body.special_requests || null,
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
    const auth = await protectGuestRoute(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });

    const existing = await queryOne(
      'SELECT * FROM tour_bookings WHERE id = $1 AND guest_id = $2',
      [id, auth.guestId]
    );

    if (!existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    if (action === 'cancel') {
      if (existing.guest_status === 'cancelled') {
        return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
      }

      await queryOne(
        `UPDATE tour_bookings SET guest_status = 'cancelled' WHERE id = $1 RETURNING id`,
        [id]
      );

      if (existing.schedule_id) {
        await query(
          `UPDATE tour_schedules SET capacity_remaining = capacity_remaining + $1 WHERE id = $2`,
          [existing.num_guests || 1, existing.schedule_id]
        );
      }

      return NextResponse.json({ success: true, message: 'Booking cancelled' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
