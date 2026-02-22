import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { listThreads } from '@/lib/email/email-queries';

export async function GET(request: NextRequest) {
  const authResult = await protectRoute(request, 'email:read');
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
  const folder = searchParams.get('folder');
  const starred = searchParams.get('starred') === 'true';
  const archived = searchParams.get('archived') === 'true';
  const labelId = searchParams.get('labelId');

  // Non-admin users only see threads assigned to them unless they have read_all
  const assignedTo = authResult.permissions.includes('email:read_all')
    ? undefined
    : parseInt(authResult.userId);

  try {
    const result = await listThreads({
      accountId: accountId ? parseInt(accountId) : undefined,
      assignedTo,
      status: status || undefined,
      search: search || undefined,
      page,
      limit,
      folder: folder || undefined,
      starred: starred || undefined,
      archived: archived || undefined,
      labelId: labelId ? parseInt(labelId) : undefined,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch threads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
