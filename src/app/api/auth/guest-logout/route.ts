import { NextResponse } from 'next/server';

const GUEST_COOKIE_NAME = 'nayara_guest_token';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(GUEST_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
