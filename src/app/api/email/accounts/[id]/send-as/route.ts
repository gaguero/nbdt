import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { listSendAsAddresses } from '@/lib/email/send-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'email:send');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const sendAs = await listSendAsAddresses(parseInt(id));
    return NextResponse.json({ sendAs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Send-As addresses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
