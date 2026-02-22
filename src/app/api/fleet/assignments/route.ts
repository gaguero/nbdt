import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const boat_id = searchParams.get('boat_id');
    const captain_id = searchParams.get('captain_id');

    let whereClause = 'WHERE fa.status != $1';
    const params: any[] = ['cancelled'];
    let idx = 2;

    if (date) {
      whereClause += ` AND fa.date = $${idx++}`;
      params.push(date);
    }
    if (boat_id) {
      whereClause += ` AND fa.boat_id = $${idx++}`;
      params.push(boat_id);
    }
    if (captain_id) {
      whereClause += ` AND fa.captain_id = $${idx++}`;
      params.push(captain_id);
    }

    const assignments = await queryMany(
      `SELECT fa.*,
              b.name as boat_name, b.type as boat_type, b.capacity as boat_capacity,
              su.first_name as captain_first_name, su.last_name as captain_last_name,
              tp.name_en as tour_name_en, tp.name_es as tour_name_es,
              g.full_name as guest_name,
              t_transfer.origin as transfer_origin, t_transfer.destination as transfer_destination
       FROM fleet_assignments fa
       LEFT JOIN boats b ON fa.boat_id = b.id
       LEFT JOIN staff_users su ON fa.captain_id = su.id
       LEFT JOIN tour_schedules ts ON fa.tour_schedule_id = ts.id
       LEFT JOIN tour_products tp ON ts.product_id = tp.id
       LEFT JOIN transfers t_transfer ON fa.transfer_id = t_transfer.id
       LEFT JOIN guests g ON t_transfer.guest_id = g.id
       ${whereClause}
       ORDER BY fa.date, fa.start_time`,
      params
    );

    return NextResponse.json({ assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:create');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const userId = (auth as any).userId;

    // Check for boat conflicts on same date/time
    const conflicts = await queryMany(
      `SELECT id FROM fleet_assignments
       WHERE boat_id = $1 AND date = $2 AND status != 'cancelled'
       AND (
         (start_time < $4 AND end_time > $3)
       )`,
      [body.boat_id, body.date, body.start_time, body.end_time]
    );

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Boat is already assigned during this time slot' },
        { status: 409 }
      );
    }

    const assignment = await queryOne(
      `INSERT INTO fleet_assignments (
        boat_id, captain_id, assignment_type, tour_schedule_id, transfer_id,
        date, start_time, end_time, status, notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        body.boat_id, body.captain_id || null, body.assignment_type,
        body.tour_schedule_id || null, body.transfer_id || null,
        body.date, body.start_time, body.end_time,
        body.status || 'scheduled', body.notes || null, userId,
      ]
    );

    // Update linked records
    if (body.tour_schedule_id) {
      await queryOne(
        `UPDATE tour_schedules SET boat_id = $1, captain_id = $2, fleet_assignment_id = $3 WHERE id = $4`,
        [body.boat_id, body.captain_id, assignment.id, body.tour_schedule_id]
      );
    }
    if (body.transfer_id) {
      await queryOne(
        `UPDATE transfers SET fleet_assignment_id = $1 WHERE id = $2`,
        [assignment.id, body.transfer_id]
      );
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:update');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const allowedFields = ['boat_id', 'captain_id', 'date', 'start_time', 'end_time', 'status', 'notes'];
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(fields[field]);
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const assignment = await queryOne(
      `UPDATE fleet_assignments SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return NextResponse.json({ assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
