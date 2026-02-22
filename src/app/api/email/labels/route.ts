import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { getLabels, createLabel, deleteLabel } from '@/lib/email/email-queries';

export async function GET(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const labels = await getLabels(
      authResult.propertyId ? parseInt(authResult.propertyId) : undefined
    );
    return NextResponse.json({ labels });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch labels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:manage');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const label = await createLabel(
      body.name,
      body.color || '#6B7280',
      authResult.propertyId ? parseInt(authResult.propertyId) : null,
      parseInt(authResult.userId)
    );
    return NextResponse.json({ label });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:manage');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    await deleteLabel(body.labelId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
