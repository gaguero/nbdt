import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);

    const { searchParams } = new URL(request.url);
    const channel_id = searchParams.get('channel_id');
    const status = searchParams.get('status');
    const guest_id = searchParams.get('guest_id');
    const assigned_to = searchParams.get('assigned_to'); // 'me', 'unassigned', or staff_id
    const filter = searchParams.get('filter'); // 'unanswered'

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (channel_id) { whereClause += ` AND c.channel_id = $${idx++}`; params.push(channel_id); }
    if (status) { whereClause += ` AND c.status = $${idx++}`; params.push(status); }
    if (guest_id) { whereClause += ` AND c.guest_id = $${idx++}`; params.push(guest_id); }

    if (assigned_to === 'me') {
      whereClause += ` AND c.assigned_staff_id = $${idx++}`;
      params.push(user.userId);
    } else if (assigned_to === 'unassigned') {
      whereClause += ` AND c.assigned_staff_id IS NULL`;
    } else if (assigned_to && assigned_to !== 'all') {
      whereClause += ` AND c.assigned_staff_id = $${idx++}`;
      params.push(assigned_to);
    }

    let havingClause = '';
    if (filter === 'unanswered') {
      // Conversations where the last message is from the guest (staff hasn't replied)
      whereClause += ` AND c.status != 'resolved'`;
      havingClause = `HAVING COALESCE((SELECT m.sender_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1), 'guest') = 'guest'`;
    }

    const conversations = await queryMany(
      `SELECT c.*, g.full_name as guest_name,
              cc.display_name_en as channel_label_en, cc.display_name_es as channel_label_es,
              cc.name as channel_name,
              s.first_name as assigned_first_name, s.last_name as assigned_last_name,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_type = 'guest') as unread_count,
              (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT m.sender_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_sender
       FROM conversations c
       LEFT JOIN guests g ON c.guest_id = g.id
       LEFT JOIN conversation_channels cc ON c.channel_id = cc.id
       LEFT JOIN staff_users s ON c.assigned_staff_id = s.id
       ${whereClause}
       GROUP BY c.id, g.full_name, cc.display_name_en, cc.display_name_es, cc.name,
                s.first_name, s.last_name
       ${havingClause}
       ORDER BY c.updated_at DESC LIMIT 100`,
      params
    );

    return NextResponse.json({ conversations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel_id, guest_id, reservation_id, room } = body;

    const existing = await queryOne(
      `SELECT id FROM conversations WHERE channel_id = $1 AND guest_id = $2 AND status != 'resolved'`,
      [channel_id, guest_id]
    );

    if (existing) {
      return NextResponse.json({ conversation: existing });
    }

    const conversation = await queryOne(
      `INSERT INTO conversations (channel_id, guest_id, reservation_id, room)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [channel_id, guest_id, reservation_id, room]
    );

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const body = await request.json();
    const { id, status, assigned_staff_id } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { setClauses.push(`status = $${idx++}`); params.push(status); }
    if (assigned_staff_id !== undefined) {
      setClauses.push(`assigned_staff_id = $${idx++}`);
      params.push(assigned_staff_id || null);
      // Auto-set status to 'assigned' when assigning someone
      if (assigned_staff_id && !status) {
        setClauses.push(`status = 'assigned'`);
      }
    }

    if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    params.push(id);
    const conversation = await queryOne(`UPDATE conversations SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    return NextResponse.json({ conversation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
