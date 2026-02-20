import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:read');
    if (auth instanceof NextResponse) return auth;

    const staff = await queryMany(
      `SELECT id, first_name, last_name, email, role, permissions, is_active, last_login_at
       FROM staff_users
       ORDER BY first_name, last_name`,
      []
    );

    return NextResponse.json({ staff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, role, permissions, is_active } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (role) { setClauses.push(`role = $${idx++}`); params.push(role); }
    if (permissions) { setClauses.push(`permissions = $${idx++}`); params.push(permissions); }
    if (is_active !== undefined) { setClauses.push(`is_active = $${idx++}`); params.push(is_active); }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    const user = await queryOne(
      `UPDATE staff_users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, first_name, last_name, role, permissions, is_active`,
      params
    );

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
