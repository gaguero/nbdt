import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

/**
 * PUT /api/auth/profile
 * Allows the logged-in user to update their own basic details.
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = verifyToken(token);
    const body = await request.json();
    const { first_name, last_name } = body;

    if (!first_name) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }

    const user = await queryOne(
      `UPDATE staff_users 
       SET first_name = $1, last_name = $2, updated_at = NOW()
       WHERE id = $3 
       RETURNING id, email, first_name, last_name, role`,
      [first_name, last_name, payload.userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Also update the matching guest profile if it exists
    await queryOne(
      `UPDATE guests SET first_name = $1, last_name = $2, updated_at = NOW() WHERE email = $3`,
      [first_name, last_name, payload.email]
    );

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
