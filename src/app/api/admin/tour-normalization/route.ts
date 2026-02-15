import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { analyzeTourNames } from '@/lib/ai/tour-normalization';

/**
 * GET /api/admin/tour-normalization
 * Fetches all tour name mappings for review.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const mappings = await query(`
      SELECT 
        m.*,
        p_sug.name_en as suggested_name,
        p_conf.name_en as confirmed_name
      FROM tour_name_mappings m
      LEFT JOIN tour_products p_sug ON m.suggested_product_id = p_sug.id
      LEFT JOIN tour_products p_conf ON m.confirmed_product_id = p_conf.id
      ORDER BY m.confidence_score ASC NULLS FIRST, m.created_at DESC
    `);

    return NextResponse.json({ mappings: mappings.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/tour-normalization
 * Triggers AI analysis of unmapped tour names.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await analyzeTourNames();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/tour-normalization
 * Confirms or updates a mapping.
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = verifyToken(token);
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, confirmed_product_id, is_ignored } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Mapping ID is required' }, { status: 400 });
    }

    await query(
      `UPDATE tour_name_mappings 
       SET confirmed_product_id = $1, 
           is_ignored = $2, 
           updated_at = NOW() 
       WHERE id = $3`,
      [confirmed_product_id || null, is_ignored || false, id]
    );

    return NextResponse.json({ message: 'Mapping updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
