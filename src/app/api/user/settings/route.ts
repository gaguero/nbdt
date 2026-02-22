import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * GET /api/user/settings — fetch the current user's settings JSONB
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = verifyToken(token);

    const row = await queryOne<{ settings: any }>(
      `SELECT COALESCE(settings, '{}') AS settings FROM staff_users WHERE id = $1`,
      [userId],
    );
    if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ settings: row.settings });
  } catch (err: any) {
    console.error('GET /api/user/settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/user/settings — merge-update the current user's settings JSONB
 * Body: { dashboardLayout?: ..., ...anyKey }
 * Uses jsonb_concat so callers only send the keys they want to update.
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = verifyToken(token);

    const body = await request.json();

    const row = await queryOne<{ settings: any }>(
      `UPDATE staff_users
       SET settings = COALESCE(settings, '{}') || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING settings`,
      [userId, JSON.stringify(body)],
    );

    if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ settings: row.settings });
  } catch (err: any) {
    console.error('PUT /api/user/settings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
