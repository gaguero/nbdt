import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversation_id = searchParams.get('conversation_id');

    if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });

    const messages = await queryMany(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversation_id]
    );

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, sender_type, sender_id, body: messageBody, is_internal } = body;

    const message = await queryOne(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, body, is_internal_note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [conversation_id, sender_type, sender_id, messageBody, is_internal || false]
    );

    await query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversation_id]
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, reader_type } = body;

    if (reader_type === 'staff') {
      await query(
        `UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_type = 'guest' AND read_at IS NULL`,
        [conversation_id]
      );
    } else {
      await query(
        `UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_type = 'staff' AND is_internal = false AND read_at IS NULL`,
        [conversation_id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
