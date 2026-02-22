import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { getThreadWithMessages, updateThread } from '@/lib/email/email-queries';
import { linkThreadToGuest } from '@/lib/email/guest-linker';

// GET /api/email/threads/[id] - Get thread with all messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const result = await getThreadWithMessages(parseInt(id));
    if (!result) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/email/threads/[id] - Update thread (status, assign, tags, star, archive, link guest)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const threadId = parseInt(id);

  try {
    const body = await request.json();

    // Handle guest linking separately
    if (body.guest_id !== undefined || body.reservation_id !== undefined) {
      await linkThreadToGuest(threadId, body.guest_id ?? null, body.reservation_id ?? null);
    }

    // Handle other updates
    const updates: {
      status?: string;
      assigned_to?: number | null;
      priority?: string;
      tags?: string[];
      is_starred?: boolean;
      is_archived?: boolean;
      snoozed_until?: string | null;
      folder?: string;
    } = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.is_starred !== undefined) updates.is_starred = body.is_starred;
    if (body.is_archived !== undefined) updates.is_archived = body.is_archived;
    if (body.snoozed_until !== undefined) updates.snoozed_until = body.snoozed_until;
    if (body.folder !== undefined) updates.folder = body.folder;

    if (Object.keys(updates).length > 0) {
      await updateThread(threadId, updates, parseInt(authResult.userId));
    }

    const result = await getThreadWithMessages(threadId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update thread';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
