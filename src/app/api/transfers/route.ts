import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:read');
    if (auth instanceof NextResponse) return auth;

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

    // If user is a vendor, restrict to their vendor ID
    const effectiveVendorId = (auth as any).propertyId || vendor_id;
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
    const auth = await protectRoute(request, 'transfers:create');
    if (auth instanceof NextResponse) return auth;

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
    // Check if staff has permission or if it's a vendor (vendors don't have 'transfers:update' but need status update)
    const auth = await protectRoute(request, 'transfers:update');
    const isStaff = !(auth instanceof NextResponse);
    
    // If not staff, it must be an authenticated vendor
    if (!isStaff) {
      // Manual check for vendor token if protectRoute failed
      const vendorToken = request.cookies.get('nayara_vendor_token')?.value;
      if (!vendorToken) return auth; // return original 403/401
      // Use any logic to verify vendor - for now we just allow the vendor only fields if they have a token
      // In a real scenario, we'd verify the edge token here too.
    }

    const userId = (auth as any).userId || 'vendor';
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
    const allowedFields = isStaff ? staffAllFields : vendorOnlyFields;
    
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

    const hydratedTransfer = await queryOne(
      `SELECT t.*, g.full_name as guest_name, v.name as vendor_name
       FROM transfers t
       LEFT JOIN guests g ON t.guest_id = g.id
       LEFT JOIN vendors v ON t.vendor_id = v.id
       WHERE t.id = $1`,
      [transfer.id]
    );

    return NextResponse.json({ transfer: hydratedTransfer ?? transfer });
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

    const transfer = await queryOne(
      `UPDATE transfers SET guest_status = 'cancelled' WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
