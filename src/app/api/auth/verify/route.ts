import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);

    return NextResponse.json({
      authenticated: true,
      user: payload,
    });
  } catch {
    return NextResponse.json({ error: 'Authentication verification failed' }, { status: 401 });
  }
}
