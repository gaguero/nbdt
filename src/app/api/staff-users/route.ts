import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, transaction } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:read');
    if (auth instanceof NextResponse) return auth;

    const staff = await queryMany(
      `SELECT id, first_name, last_name, email, role, permissions, is_active, last_login_at, station
       FROM staff_users
       ORDER BY first_name, last_name`,
      []
    );

    return NextResponse.json({ staff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { email, first_name, last_name, role, password, station, property_id } = body;

    if (!email || !first_name || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);

    const result = await transaction(async (client) => {
      // 1. Create staff user
      const userRes = await client.query(
        `INSERT INTO staff_users (email, first_name, last_name, role, password_hash, station, property_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, role, station`,
        [email.toLowerCase(), first_name, last_name, role, password_hash, station || null, property_id || (auth as any).propertyId]
      );
      
      const user = userRes.rows[0];

      // 2. Ensure a staff profile exists in the guests table
      await client.query(
        `INSERT INTO guests (email, first_name, last_name, profile_type)
         VALUES ($1, $2, $3, 'staff')
         ON CONFLICT (email) DO UPDATE SET profile_type = 'staff'
         WHERE guests.profile_type != 'staff'`,
        [email.toLowerCase(), first_name, last_name]
      );

      return user;
    });

    return NextResponse.json({ user: result }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, role, permissions, is_active, station, first_name, last_name } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (role) { setClauses.push(`role = $${idx++}`); params.push(role); }
    if (permissions) { setClauses.push(`permissions = $${idx++}`); params.push(permissions); }
    if (is_active !== undefined) { setClauses.push(`is_active = $${idx++}`); params.push(is_active); }
    if (station !== undefined) { setClauses.push(`station = $${idx++}`); params.push(station); }
    if (first_name) { setClauses.push(`first_name = $${idx++}`); params.push(first_name); }
    if (last_name) { setClauses.push(`last_name = $${idx++}`); params.push(last_name); }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const user = await queryOne(
      `UPDATE staff_users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, first_name, last_name, role, permissions, is_active, station`,
      params
    );

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, password } = body;

    if (!id || !password) {
      return NextResponse.json({ error: 'ID and new password required' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    await queryOne(
      `UPDATE staff_users SET password_hash = $1 WHERE id = $2 RETURNING id`,
      [password_hash, id]
    );

    return NextResponse.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
