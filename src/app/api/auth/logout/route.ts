import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

// ============================================================================
// LOGOUT HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear the auth cookie by setting it to expire immediately
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

// ============================================================================
// METHOD NOT ALLOWED HANDLER
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
