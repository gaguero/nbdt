import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { markMessageRead } from '@/lib/email/email-queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const body = await request.json();
    const isRead = body.is_read !== undefined ? body.is_read : true;
    await markMessageRead(parseInt(id), isRead);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update read status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
