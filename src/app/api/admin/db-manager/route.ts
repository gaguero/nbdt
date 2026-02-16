import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

const TABLES = [
  'guests', 'reservations', 'transfers', 'tour_bookings', 'special_requests', 
  'romantic_dinners', 'other_hotel_bookings', 'conversations', 'messages', 'orders', 'order_items'
];

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const stats = await Promise.all(TABLES.map(async (table) => {
      const res = await query(`SELECT COUNT(*) as count FROM ${table}`);
      return { table, count: parseInt(res.rows[0].count) };
    }));
    return NextResponse.json({ stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    if (!table || !TABLES.includes(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

    await query(`DELETE FROM ${table}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
