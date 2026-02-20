import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'settings:manage');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const vendor = await queryOne('SELECT * FROM vendors WHERE id = $1', [id]);
      if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const transfers = await queryMany(
        `SELECT t.*, g.full_name as guest_name FROM transfers t LEFT JOIN guests g ON t.guest_id = g.id WHERE t.vendor_id = $1 ORDER BY t.date DESC LIMIT 50`, [id]
      );
      const tourBookings = await queryMany(
        `SELECT tb.*, g.full_name as guest_name, tp.name_en as product_name
         FROM tour_bookings tb LEFT JOIN guests g ON tb.guest_id = g.id LEFT JOIN tour_products tp ON tb.product_id = tp.id
         WHERE tb.vendor_id = $1 ORDER BY tb.created_at DESC LIMIT 50`, [id]
      );
      const users = await queryMany(
        `SELECT id, email, is_active, last_login_at, created_at FROM vendor_users WHERE vendor_id = $1`, [id]
      );

      return NextResponse.json({ vendor, transfers, tourBookings, users });
    }

    const type = searchParams.get('type');
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (type) { where += ` AND type = $${params.length + 1}`; params.push(type); }
    const vendors = await queryMany(`SELECT * FROM vendors ${where} ORDER BY name`, params);
    return NextResponse.json({ vendors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'settings:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    if (body.create_user) {
      const passwordHash = await hashPassword(body.user_password);
      const vendorUser = await queryOne(
        `INSERT INTO vendor_users (vendor_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, is_active`,
        [body.vendor_id, body.user_email, passwordHash]
      );
      return NextResponse.json({ vendorUser }, { status: 201 });
    }

    const vendor = await queryOne(
      `INSERT INTO vendors (name, email, phone, type, color_code, is_active, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [body.name, body.email || null, body.phone || null, body.type, body.color_code || '#6B7280', body.is_active !== false, body.notes || null]
    );

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'settings:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowedFields = ['name', 'email', 'phone', 'type', 'color_code', 'is_active', 'notes'];
    for (const field of allowedFields) {
      if (field in fields) { setClauses.push(`${field} = $${idx++}`); params.push(fields[field]); }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    params.push(id);
    const vendor = await queryOne(`UPDATE vendors SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    return NextResponse.json({ vendor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
