import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const channels = await queryMany(
      `SELECT id, name, display_name_en, display_name_es FROM conversation_channels ORDER BY display_name_en`,
      []
    );

    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
