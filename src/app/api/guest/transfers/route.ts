import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectGuestRoute } from '@/lib/guest-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectGuestRoute(request);
    if (auth instanceof NextResponse) return auth;

    const transfers = await queryMany(
      `SELECT t.*, v.name as vendor_name,
              fa.boat_id, fa.status as fleet_status,
              b.name as boat_name, b.type as boat_type
       FROM transfers t
       LEFT JOIN vendors v ON t.vendor_id = v.id
       LEFT JOIN fleet_assignments fa ON t.fleet_assignment_id = fa.id
       LEFT JOIN boats b ON fa.boat_id = b.id
       WHERE t.guest_id = $1
       ORDER BY t.date ASC, t.time ASC`,
      [auth.guestId]
    );

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectGuestRoute(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { date, time, origin, destination, num_passengers, notes } = body;

    if (!date || !origin || !destination) {
      return NextResponse.json(
        { error: 'Date, origin, and destination are required' },
        { status: 400 }
      );
    }

    const transfer = await queryOne(
      `INSERT INTO transfers (date, time, guest_id, reservation_id, num_passengers,
                              origin, destination, transfer_type, guest_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'inter_hotel', 'pending', $8)
       RETURNING *`,
      [date, time || null, auth.guestId, auth.reservationId,
       num_passengers || 1, origin, destination, notes || null]
    );

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectGuestRoute(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, action, ...fields } = body;

    if (!id) return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });

    const existing = await queryOne(
      'SELECT * FROM transfers WHERE id = $1 AND guest_id = $2',
      [id, auth.guestId]
    );

    if (!existing) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });

    if (action === 'cancel') {
      if (existing.guest_status !== 'pending') {
        return NextResponse.json({ error: 'Only pending transfers can be cancelled' }, { status: 400 });
      }
      const transfer = await queryOne(
        `UPDATE transfers SET guest_status = 'cancelled' WHERE id = $1 RETURNING *`,
        [id]
      );
      return NextResponse.json({ transfer });
    }

    // Only allow editing pending transfers
    if (existing.guest_status !== 'pending') {
      return NextResponse.json({ error: 'Only pending transfers can be edited' }, { status: 400 });
    }

    const allowedFields = ['time', 'num_passengers', 'notes'];
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(fields[field]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    const transfer = await queryOne(
      `UPDATE transfers SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return NextResponse.json({ transfer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
