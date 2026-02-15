import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const PinLoginSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
  station: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pin } = PinLoginSchema.parse(body);

  const allStaff = await queryMany<{
    id: string;
    email: string;
    role: string;
    pin_hash: string;
    station: string;
    first_name: string;
    last_name: string;
    property_id: string;
  }>(
    `SELECT id, email, role, pin_hash, station, first_name, last_name, property_id
     FROM staff_users
     WHERE is_active = true AND pin_hash IS NOT NULL`
  );

  for (const staff of allStaff) {
    const valid = await comparePassword(pin, staff.pin_hash);
    if (valid) {
      const token = generateToken(
        staff.id,
        staff.email,
        staff.role as any,
        staff.property_id
      );

      const response = NextResponse.json({
        staff_id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`,
        role: staff.role,
        station: staff.station,
      });

      response.cookies.set('nayara_kds_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 12,
        path: '/',
      });

      return response;
    }
  }

  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
}
