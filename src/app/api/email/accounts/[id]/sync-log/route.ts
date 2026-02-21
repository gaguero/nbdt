import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

  try {
    const result = await query(
      `SELECT * FROM email_sync_log
       WHERE account_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [id, limit]
    );

    return NextResponse.json({ logs: result.rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sync logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
