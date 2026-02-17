import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const staff = await queryMany(
      `SELECT id, first_name, last_name, role
       FROM staff_users
       WHERE is_active = true OR is_active IS NULL
       ORDER BY first_name, last_name`,
      []
    );

    return NextResponse.json({ staff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
