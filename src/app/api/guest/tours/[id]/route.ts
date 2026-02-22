import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryMany } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await queryOne(
      `SELECT tp.*, v.name as vendor_name
       FROM tour_products tp
       LEFT JOIN vendors v ON tp.vendor_id = v.id
       WHERE tp.id = $1 AND tp.is_active = true`,
      [id]
    );

    if (!product) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Get available schedules (future dates with capacity)
    const today = new Date().toISOString().split('T')[0];
    const schedules = await queryMany(
      `SELECT id, date, start_time, end_time, capacity_remaining, override_price
       FROM tour_schedules
       WHERE product_id = $1 AND date >= $2 AND is_available = true AND capacity_remaining > 0
       ORDER BY date, start_time
       LIMIT 30`,
      [id, today]
    );

    return NextResponse.json({ product, schedules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
