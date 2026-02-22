import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (status) {
      whereClause += ` AND b.status = $${idx++}`;
      params.push(status);
    }

    let boats;
    try {
      boats = await queryMany(
        `SELECT b.*,
                COALESCE((SELECT COUNT(*) FROM fleet_assignments fa
                 WHERE fa.boat_id = b.id AND fa.date = CURRENT_DATE AND fa.status != 'cancelled'), 0) as today_assignments
         FROM boats b
         ${whereClause}
         ORDER BY b.name`,
        params
      );
    } catch {
      // Fallback if fleet_assignments table doesn't exist yet
      boats = await queryMany(
        `SELECT b.*, 0 as today_assignments FROM boats b ${whereClause} ORDER BY b.name`,
        params
      );
    }

    return NextResponse.json({ boats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:create');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const boat = await queryOne(
      `INSERT INTO boats (name, type, capacity, status, photo_url, home_dock, registration_number, gps_device_id, notes, property_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        body.name, body.type || 'speedboat', body.capacity || 12, body.status || 'active',
        body.photo_url || null, body.home_dock || null, body.registration_number || null,
        body.gps_device_id || null, body.notes || null, body.property_id || null,
      ]
    );

    return NextResponse.json({ boat }, { status: 201 });
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

    const allowedFields = ['name', 'type', 'capacity', 'status', 'photo_url', 'home_dock', 'registration_number', 'gps_device_id', 'notes', 'property_id'];
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
    const boat = await queryOne(
      `UPDATE boats SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return NextResponse.json({ boat });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:delete');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await queryOne(`UPDATE boats SET status = 'out_of_service' WHERE id = $1 RETURNING id`, [id]);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
