import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { addThreadLabel, removeThreadLabel } from '@/lib/email/email-queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const body = await request.json();
    await addThreadLabel(parseInt(id), body.labelId, parseInt(authResult.userId));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const body = await request.json();
    await removeThreadLabel(parseInt(id), body.labelId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
