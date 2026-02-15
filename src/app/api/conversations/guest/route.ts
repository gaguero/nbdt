import { NextRequest, NextResponse } from 'next/server';
import { queryMany } from '@/lib/db';

// Public endpoint — guests fetch their own conversations by guest_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guest_id = searchParams.get('guest_id');

    if (!guest_id) {
      return NextResponse.json({ error: 'guest_id required' }, { status: 400 });
    }

    const conversations = await queryMany(
      `SELECT c.id, c.channel_id, c.status, c.updated_at
       FROM conversations c
       WHERE c.guest_id = $1 AND c.status != 'resolved'
       ORDER BY c.updated_at DESC`,
      [guest_id]
    );

    return NextResponse.json({ conversations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
