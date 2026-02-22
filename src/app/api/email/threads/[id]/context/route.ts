import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { getThreadContactContext } from '@/lib/email/context-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const context = await getThreadContactContext(parseInt(id));
    if (!context) {
      return NextResponse.json({ error: 'No contact context found' }, { status: 404 });
    }
    return NextResponse.json(context);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch context';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
