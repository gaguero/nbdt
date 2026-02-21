import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { getUnreadCount } from '@/lib/email/email-queries';

export async function GET(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const count = await getUnreadCount(parseInt(authResult.userId));
    return NextResponse.json({ count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get unread count';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
