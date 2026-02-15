import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (type) { whereClause += ` AND tp.type = $${idx++}`; params.push(type); }
    if (active !== null) { whereClause += ` AND tp.is_active = $${idx++}`; params.push(active === 'true'); }

    const products = await queryMany(
      `SELECT tp.*, v.name as vendor_name
       FROM tour_products tp
       LEFT JOIN vendors v ON tp.vendor_id = v.id
       ${whereClause}
       ORDER BY tp.name_en`,
      params
    );

    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const product = await queryOne(
      `INSERT INTO tour_products (
        name_en, name_es, description_en, description_es, vendor_id,
        type, booking_mode, max_capacity_shared, max_capacity_private,
        duration_minutes, price_private, price_shared, price_per_person,
        requires_minimum_guests, max_guests_per_booking, location,
        meeting_point_en, meeting_point_es, cancellation_policy_hours,
        is_active, images, tags, custom_fields, scheduling_mode
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *`,
      [
        body.name_en, body.name_es, body.description_en, body.description_es, body.vendor_id,
        body.type || 'tour', body.booking_mode || 'either', body.max_capacity_shared, body.max_capacity_private,
        body.duration_minutes, body.price_private, body.price_shared, body.price_per_person,
        body.requires_minimum_guests || 1, body.max_guests_per_booking, body.location,
        body.meeting_point_en, body.meeting_point_es, body.cancellation_policy_hours || 24,
        body.is_active !== false, JSON.stringify(body.images || []), body.tags || [],
        JSON.stringify(body.custom_fields || {}), body.scheduling_mode || 'fixed_slots',
      ]
    );

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const allowedFields = [
      'name_en', 'name_es', 'description_en', 'description_es', 'vendor_id',
      'type', 'booking_mode', 'max_capacity_shared', 'max_capacity_private',
      'duration_minutes', 'price_private', 'price_shared', 'price_per_person',
      'requires_minimum_guests', 'max_guests_per_booking', 'location',
      'meeting_point_en', 'meeting_point_es', 'cancellation_policy_hours',
      'is_active', 'images', 'tags', 'custom_fields', 'scheduling_mode',
    ];

    for (const field of allowedFields) {
      if (field in fields) {
        setClauses.push(`${field} = $${idx++}`);
        const val = (field === 'images' || field === 'custom_fields')
          ? JSON.stringify(fields[field])
          : fields[field];
        params.push(val);
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const product = await queryOne(
      `UPDATE tour_products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
