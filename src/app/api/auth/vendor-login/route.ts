import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = LoginSchema.parse(body);

  const vendorUser = await queryOne(
    `SELECT vu.*, v.name as vendor_name, v.id as vendor_id
     FROM vendor_users vu
     JOIN vendors v ON v.id = vu.vendor_id
     WHERE vu.email = $1 AND vu.is_active = true`,
    [email.toLowerCase()]
  );

  if (!vendorUser) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await comparePassword(password, vendorUser.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await queryOne(
    `UPDATE vendor_users SET last_login_at = NOW() WHERE id = $1`,
    [vendorUser.id]
  );

  const token = generateToken(vendorUser.id, vendorUser.email, 'staff' as any, vendorUser.vendor_id);

  const response = NextResponse.json({
    vendor_user_id: vendorUser.id,
    vendor_id: vendorUser.vendor_id,
    vendor_name: vendorUser.vendor_name,
    email: vendorUser.email,
  });

  response.cookies.set('nayara_vendor_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
