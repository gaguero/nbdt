import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import jwt from 'jsonwebtoken';

export const GUEST_COOKIE_NAME = 'nayara_guest_token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservation_number, last_name } = body;

    if (!reservation_number || !last_name) {
      return NextResponse.json(
        { error: 'Reservation number and last name are required' },
        { status: 400 }
      );
    }

    const reservation = await queryOne(
      `SELECT r.*, g.full_name as guest_name, g.first_name, g.last_name as g_last_name,
              g.id as guest_id, g.email as guest_email
       FROM reservations r
       JOIN guests g ON r.guest_id = g.id
       WHERE r.opera_resv_id = $1
         AND LOWER(g.last_name) = LOWER($2)
         AND r.status IN ('CHECKED IN', 'RESERVED')
       ORDER BY r.arrival DESC
       LIMIT 1`,
      [reservation_number.trim(), last_name.trim()]
    );

    if (!reservation) {
      return NextResponse.json(
        { error: 'No matching reservation found. Please check your reservation number and last name.' },
        { status: 404 }
      );
    }

    const roomRecord = await queryOne(
      `SELECT rm.id as room_id, rm.property_id FROM rooms rm WHERE rm.room_number = $1 LIMIT 1`,
      [reservation.room]
    );

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const payload = {
      type: 'guest',
      guestId: reservation.guest_id,
      reservationId: reservation.id,
      room: reservation.room,
      propertyId: roomRecord?.property_id || null,
      firstName: reservation.first_name,
      lastName: reservation.g_last_name,
      guestName: reservation.guest_name,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    const response = NextResponse.json({
      success: true,
      guest: {
        guest_id: reservation.guest_id,
        reservation_id: reservation.id,
        guest_name: reservation.guest_name,
        first_name: reservation.first_name,
        room: reservation.room,
        arrival: reservation.arrival,
        departure: reservation.departure,
        status: reservation.status,
      },
    });

    response.cookies.set(GUEST_COOKIE_NAME, token, {
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
