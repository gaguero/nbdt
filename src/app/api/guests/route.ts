import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    if (id) {
      const guest = await queryOne(
        `SELECT * FROM guests WHERE id = $1`, [id]
      );
      if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

      const reservations = await queryMany(
        `SELECT *, opera_guest_name FROM reservations WHERE guest_id = $1 ORDER BY arrival DESC`, [id]
      );
      const transfers = await queryMany(
        `SELECT t.*, v.name as vendor_name FROM transfers t LEFT JOIN vendors v ON t.vendor_id = v.id WHERE t.guest_id = $1 ORDER BY t.date DESC`, [id]
      );
      const tourBookings = await queryMany(
        `SELECT tb.*, tp.name_en as product_name FROM tour_bookings tb LEFT JOIN tour_products tp ON tb.product_id = tp.id WHERE tb.guest_id = $1 ORDER BY tb.created_at DESC`, [id]
      );
      const specialRequests = await queryMany(
        `SELECT * FROM special_requests WHERE guest_id = $1 ORDER BY date DESC`, [id]
      );

      return NextResponse.json({ guest, reservations, transfers, tourBookings, specialRequests });
    }

    let whereClause = '';
    const params: any[] = [];
    if (search) {
      whereClause = `WHERE full_name ILIKE $1`;
      params.push(`%${search}%`);
    }

    const guests = await queryMany(
      `SELECT * FROM guests ${whereClause} ORDER BY full_name LIMIT 200`,
      params
    );

    return NextResponse.json({ guests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const body = await request.json();
    const { first_name, last_name, email, phone, nationality, notes } = body;

    const guest = await queryOne(
      `INSERT INTO guests (first_name, last_name, email, phone, nationality, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [first_name, last_name, email, phone, nationality || null, notes]
    );

    return NextResponse.json({ guest }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const body = await request.json();
    const { first_name, last_name, email, phone, nationality, notes } = body;

    const guest = await queryOne(
      `UPDATE guests SET first_name = $1, last_name = $2, email = $3, phone = $4, nationality = $5, notes = $6
       WHERE id = $7 RETURNING *`,
      [first_name, last_name, email, phone, nationality || null, notes, id]
    );
    if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ guest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const guest = await queryOne(`DELETE FROM guests WHERE id = $1 RETURNING id`, [id]);
    if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
