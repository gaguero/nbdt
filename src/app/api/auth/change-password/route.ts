import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME, comparePassword, hashPassword } from '@/lib/auth';

/**
 * PUT /api/auth/change-password
 * Secure self-service password change. Requires current password.
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = verifyToken(token);
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    // 1. Fetch current user with hash
    const user = await queryOne(
      'SELECT id, password_hash FROM staff_users WHERE id = $1',
      [payload.userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Verify current password
    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    // 3. Hash and save new password
    const newHash = await hashPassword(newPassword);
    await queryOne(
      'UPDATE staff_users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [newHash, payload.userId]
    );

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
