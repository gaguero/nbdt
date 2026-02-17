import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const service_type = searchParams.get('service_type') || 'transfers';
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const billing_status = searchParams.get('billing_status') || 'all';

    const params: any[] = [];
    let idx = 1;
    let whereClause = 'WHERE 1=1';

    if (date_from) { whereClause += ` AND t.date >= $${idx++}`; params.push(date_from); }
    if (date_to) { whereClause += ` AND t.date <= $${idx++}`; params.push(date_to); }

    if (billing_status === 'unbilled') whereClause += ' AND t.billed_date IS NULL AND t.paid_date IS NULL';
    else if (billing_status === 'billed') whereClause += ' AND t.billed_date IS NOT NULL AND t.paid_date IS NULL';
    else if (billing_status === 'paid') whereClause += ' AND t.paid_date IS NOT NULL';

    let rows: any[] = [];

    if (service_type === 'transfers') {
      rows = await queryMany(
        `SELECT t.id, t.date, t.billed_date, t.paid_date,
                g.full_name as guest_name, v.name as vendor_name,
                t.origin || ' → ' || t.destination as description,
                t.num_passengers as pax, t.guest_status as status,
                'transfers' as service_type
         FROM transfers t
         LEFT JOIN guests g ON t.guest_id = g.id
         LEFT JOIN vendors v ON t.vendor_id = v.id
         ${whereClause}
         ORDER BY t.date DESC LIMIT 500`,
        params
      );
    } else if (service_type === 'tours') {
      rows = await queryMany(
        `SELECT t.id, s.date, t.billed_date, t.paid_date,
                g.full_name as guest_name, v.name as vendor_name,
                p.name_en as description,
                t.num_guests as pax, t.guest_status as status,
                t.total_price as amount,
                'tours' as service_type
         FROM tour_bookings t
         LEFT JOIN tour_schedules s ON t.schedule_id = s.id
         LEFT JOIN tour_products p ON t.product_id = p.id
         LEFT JOIN guests g ON t.guest_id = g.id
         LEFT JOIN vendors v ON s.vendor_id = v.id
         ${whereClause.replace('t.date', 's.date')}
         ORDER BY s.date DESC LIMIT 500`,
        params
      );
    } else if (service_type === 'romantic_dinners') {
      rows = await queryMany(
        `SELECT t.id, t.date, t.billed_date, t.paid_date,
                g.full_name as guest_name, v.name as vendor_name,
                t.location as description,
                t.num_guests as pax, t.status,
                'romantic_dinners' as service_type
         FROM romantic_dinners t
         LEFT JOIN guests g ON t.guest_id = g.id
         LEFT JOIN vendors v ON t.vendor_id = v.id
         ${whereClause}
         ORDER BY t.date DESC LIMIT 500`,
        params
      );
    }

    return NextResponse.json({ rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const body = await request.json();
    const { ids, service_type, field, value } = body;

    if (!ids?.length || !service_type || !field) {
      return NextResponse.json({ error: 'ids, service_type, and field are required' }, { status: 400 });
    }

    if (!['billed_date', 'paid_date'].includes(field)) {
      return NextResponse.json({ error: 'Only billed_date and paid_date can be updated' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      transfers: 'transfers',
      tours: 'tour_bookings',
      romantic_dinners: 'romantic_dinners',
    };

    const table = tableMap[service_type];
    if (!table) return NextResponse.json({ error: 'Invalid service_type' }, { status: 400 });

    const placeholders = ids.map((_: any, i: number) => `$${i + 2}`).join(', ');
    await queryMany(
      `UPDATE ${table} SET ${field} = $1 WHERE id IN (${placeholders})`,
      [value, ...ids]
    );

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
