import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { verifyTokenEdge } from '@/lib/jwt-edge';

export async function GET(request: NextRequest) {
  try {
    const staffToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const vendorToken = request.cookies.get('nayara_vendor_token')?.value;

    let autoVendorId: string | null = null;

    if (staffToken) {
      verifyToken(staffToken);
    } else if (vendorToken) {
      const payload = await verifyTokenEdge(vendorToken);
      autoVendorId = payload.propertyId;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const vendor_id = searchParams.get('vendor_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (filter === 'today') {
      whereClause += ` AND t.date = CURRENT_DATE`;
    } else if (filter === 'upcoming') {
      whereClause += ` AND t.date >= CURRENT_DATE`;
    } else if (filter === 'past') {
      whereClause += ` AND t.date < CURRENT_DATE`;
    }

    if (date_from) { whereClause += ` AND t.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND t.date <= $${idx++}`; params.push(date_to); }

    const effectiveVendorId = autoVendorId || vendor_id;
    if (effectiveVendorId) {
      whereClause += ` AND t.vendor_id = $${idx++}`;
      params.push(effectiveVendorId);
    }

    const transfers = await queryMany(
      `SELECT t.*, g.full_name as guest_name, v.name as vendor_name
       FROM transfers t
       LEFT JOIN guests g ON t.guest_id = g.id
       LEFT JOIN vendors v ON t.vendor_id = v.id
       ${whereClause}
       ORDER BY t.date DESC, t.time DESC
       LIMIT 200`,
      params
    );

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);

    const body = await request.json();
    const { date, time, guest_id, reservation_id, vendor_id, num_passengers, origin, destination, flight_number, notes } = body;

    const transfer = await queryOne(
      `INSERT INTO transfers (date, time, guest_id, reservation_id, vendor_id, num_passengers, origin, destination, flight_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [date, time, guest_id, reservation_id, vendor_id, num_passengers || 1, origin, destination, flight_number, notes]
    );

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
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

    const existing = await queryOne('SELECT * FROM transfers WHERE id = $1', [id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const vendorOnlyFields = ['vendor_status'];
    const staffAllFields = ['date', 'time', 'guest_id', 'reservation_id', 'vendor_id', 'num_passengers', 'origin', 'destination', 'flight_number', 'guest_status', 'vendor_status', 'billed_date', 'paid_date', 'notes'];
    const allowedFields = staffToken ? staffAllFields : vendorOnlyFields;
    for (const field of allowedFields) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(fields[field]);

        if (existing[field] !== fields[field]) {
          await query(
            `INSERT INTO transfer_history (transfer_id, changed_by, field, old_value, new_value)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, userId, field, String(existing[field] ?? ''), String(fields[field] ?? '')]
          );
        }
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

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
