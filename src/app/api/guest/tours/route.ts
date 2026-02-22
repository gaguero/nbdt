import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let whereClause = 'WHERE tp.is_active = true AND tp.type != $1';
    const params: any[] = ['spa']; // Exclude spa from guest tour catalog
    let idx = 2;

    if (type) {
      whereClause += ` AND tp.type = $${idx++}`;
      params.push(type);
    }

    // Try with guest_visible filter first, fallback if column doesn't exist yet
    let products;
    try {
      products = await queryMany(
        `SELECT tp.id, tp.name_en, tp.name_es, tp.description_en, tp.description_es,
                tp.type, tp.booking_mode, tp.duration_minutes,
                tp.price_per_person, tp.price_shared, tp.price_private,
                tp.max_guests_per_booking, tp.location, tp.meeting_point_en, tp.meeting_point_es,
                tp.cancellation_policy_hours, tp.images, tp.tags,
                COALESCE(tp.requires_boat, false) as requires_boat,
                COALESCE(tp.is_internal_operation, false) as is_internal_operation,
                v.name as vendor_name
         FROM tour_products tp
         LEFT JOIN vendors v ON tp.vendor_id = v.id
         ${whereClause} AND COALESCE(tp.guest_visible, true) = true
         ORDER BY tp.sort_order, tp.name_en`,
        params
      );
    } catch {
      // Fallback: guest_visible column may not exist yet
      products = await queryMany(
        `SELECT tp.id, tp.name_en, tp.name_es, tp.description_en, tp.description_es,
                tp.type, tp.booking_mode, tp.duration_minutes,
                tp.price_per_person, tp.price_shared, tp.price_private,
                tp.max_guests_per_booking, tp.location, tp.meeting_point_en, tp.meeting_point_es,
                tp.cancellation_policy_hours, tp.images, tp.tags,
                false as requires_boat, false as is_internal_operation,
                v.name as vendor_name
         FROM tour_products tp
         LEFT JOIN vendors v ON tp.vendor_id = v.id
         ${whereClause}
         ORDER BY tp.sort_order, tp.name_en`,
        params
      );
    }

    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
