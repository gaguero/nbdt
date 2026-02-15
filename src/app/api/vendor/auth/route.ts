import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const VENDOR_COOKIE_NAME = 'nayara_vendor_token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const vendorUser = await queryOne(
      `SELECT vu.*, v.name as vendor_name, v.id as vendor_id
       FROM vendor_users vu
       JOIN vendors v ON vu.vendor_id = v.id
       WHERE vu.email = $1`,
      [email.toLowerCase()]
    );

    if (!vendorUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!vendorUser.is_active) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    const valid = await comparePassword(password, vendorUser.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const token = jwt.sign(
      { vendorUserId: vendorUser.id, vendorId: vendorUser.vendor_id, email: vendorUser.email, type: 'vendor' },
      secret,
      { expiresIn: '7d' }
    );

    await queryOne('UPDATE vendor_users SET last_login_at = NOW() WHERE id = $1', [vendorUser.id]);

    const response = NextResponse.json({
      message: 'Login successful',
      vendor: { id: vendorUser.vendor_id, name: vendorUser.vendor_name, email: vendorUser.email },
    });

    response.cookies.set(VENDOR_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
