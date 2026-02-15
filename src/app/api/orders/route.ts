import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query, transaction } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const station = searchParams.get('station');
    const order_type = searchParams.get('order_type');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (status) { whereClause += ` AND o.status = $${idx++}`; params.push(status); }
    if (station) { whereClause += ` AND o.station = $${idx++}`; params.push(station); }
    if (order_type) { whereClause += ` AND o.order_type = $${idx++}`; params.push(order_type); }

    const orders = await queryMany(
      `SELECT o.*, r.room_number, g.full_name as guest_name
       FROM orders o
       LEFT JOIN rooms r ON o.room_id = r.id
       LEFT JOIN guests g ON o.guest_id = g.id
       ${whereClause}
       ORDER BY o.created_at DESC LIMIT 200`,
      params
    );

    for (const order of orders) {
      order.items = await queryMany(
        `SELECT oi.*, mi.name_en, mi.name_es FROM order_items oi
         LEFT JOIN menu_items mi ON oi.item_id = mi.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
    }

    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, property_id, guest_id, reservation_id, order_type, station, special_instructions, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const order = await transaction(async (client) => {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const countResult = await client.query(
        `SELECT COUNT(*) as c FROM orders WHERE created_at::date = CURRENT_DATE`
      );
      const num = String(parseInt(countResult.rows[0].c) + 1).padStart(3, '0');
      const orderNumber = `ORD-${dateStr}-${num}`;

      let subtotal = 0;
      for (const item of items) {
        subtotal += (item.unit_price || 0) * (item.quantity || 1);
      }
      const tax = Math.round(subtotal * 0.13 * 100) / 100;
      const total = subtotal + tax;

      const orderResult = await client.query(
        `INSERT INTO orders (property_id, room_id, guest_id, reservation_id, order_number, order_type, station, subtotal, tax, total, special_instructions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [property_id, room_id, guest_id, reservation_id, orderNumber, order_type || 'room_service', station, subtotal, tax, total, special_instructions]
      );

      const createdOrder = orderResult.rows[0];

      for (const item of items) {
        const itemSubtotal = (item.unit_price || 0) * (item.quantity || 1);
        await client.query(
          `INSERT INTO order_items (order_id, item_id, quantity, unit_price, modifiers, subtotal, station, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
          [createdOrder.id, item.item_id, item.quantity || 1, item.unit_price, JSON.stringify(item.modifiers || []), itemSubtotal, item.station]
        );
      }

      await client.query(
        `INSERT INTO order_status_log (order_id, new_status) VALUES ($1, 'pending')`,
        [createdOrder.id]
      );

      return createdOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);

    const body = await request.json();
    const { id, status: newStatus, assigned_to } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (newStatus) {
      setClauses.push(`status = $${idx++}`);
      params.push(newStatus);
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        setClauses.push(`completed_at = NOW()`);
      }
      await query(
        `INSERT INTO order_status_log (order_id, old_status, new_status, changed_by) VALUES ($1,$2,$3,$4)`,
        [id, existing.status, newStatus, user.userId]
      );
    }

    if (assigned_to) {
      setClauses.push(`assigned_to = $${idx++}`);
      params.push(assigned_to);
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const order = await queryOne(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
