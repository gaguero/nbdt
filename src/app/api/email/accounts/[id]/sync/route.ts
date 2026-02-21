import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { incrementalSync } from '@/lib/email/sync-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const result = await incrementalSync(parseInt(id), 'manual');
    return NextResponse.json({
      success: true,
      messagesFetched: result.messagesFetched,
      messagesNew: result.messagesNew,
      errors: result.errors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
