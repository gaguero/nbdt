import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const GUEST_COOKIE_NAME = 'nayara_guest_token';

export interface GuestTokenPayload {
  type: 'guest';
  guestId: string;
  reservationId: string;
  room: string;
  propertyId: string | null;
  firstName: string;
  lastName: string;
  guestName: string;
}

/**
 * Verifies guest authentication from cookie.
 * Returns the guest payload or a NextResponse error.
 */
export async function protectGuestRoute(request: NextRequest): Promise<GuestTokenPayload | NextResponse> {
  const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const decoded = jwt.verify(token, secret) as GuestTokenPayload;
    if (decoded.type !== 'guest') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }
    return decoded;
  } catch {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }
}
