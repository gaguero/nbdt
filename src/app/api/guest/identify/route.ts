import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');

    if (!room) {
      return NextResponse.json({ error: 'Room number required' }, { status: 400 });
    }

    const reservation = await queryOne(
      `SELECT r.*, g.full_name as guest_name, g.first_name, g.id as guest_id
       FROM reservations r
       LEFT JOIN guests g ON r.guest_id = g.id
       WHERE r.room = $1 AND r.status = 'CHECKED IN'
       ORDER BY r.arrival DESC LIMIT 1`,
      [room]
    );

    if (!reservation) {
      return NextResponse.json({ error: 'No active reservation found for this room' }, { status: 404 });
    }

    const roomRecord = await queryOne(
      `SELECT rm.id as room_id, rm.property_id FROM rooms rm WHERE rm.room_number = $1 LIMIT 1`,
      [room]
    );

    return NextResponse.json({
      guest_name: reservation.guest_name,
      first_name: reservation.first_name,
      guest_id: reservation.guest_id,
      reservation_id: reservation.id,
      room: reservation.room,
      room_id: roomRecord?.room_id,
      property_id: roomRecord?.property_id,
      arrival: reservation.arrival,
      departure: reservation.departure,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
