import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { searchThreads } from '@/lib/email/email-queries';

export async function GET(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
  }

  try {
    const userId = authResult.permissions.includes('email:read_all')
      ? undefined
      : parseInt(authResult.userId);

    const threads = await searchThreads(q, userId);
    return NextResponse.json({ threads });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
