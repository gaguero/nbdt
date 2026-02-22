import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { queryOne } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(GUEST_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const decoded = jwt.verify(token, secret) as GuestTokenPayload;

    if (decoded.type !== 'guest') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    // Verify reservation is still active
    const reservation = await queryOne(
      `SELECT r.id, r.status, r.room, r.arrival, r.departure, g.full_name, g.first_name
       FROM reservations r
       JOIN guests g ON r.guest_id = g.id
       WHERE r.id = $1`,
      [decoded.reservationId]
    );

    if (!reservation || reservation.status === 'CANCELLED') {
      const response = NextResponse.json({ error: 'Reservation no longer active' }, { status: 401 });
      response.cookies.delete(GUEST_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      guest: {
        guest_id: decoded.guestId,
        reservation_id: decoded.reservationId,
        guest_name: reservation.full_name || decoded.guestName,
        first_name: reservation.first_name || decoded.firstName,
        room: reservation.room || decoded.room,
        arrival: reservation.arrival,
        departure: reservation.departure,
        status: reservation.status,
        property_id: decoded.propertyId,
      },
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
      response.cookies.delete(GUEST_COOKIE_NAME);
      return response;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
