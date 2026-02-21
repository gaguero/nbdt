import { NextRequest, NextResponse } from 'next/server';
import { renewExpiringWatches } from '@/lib/email/watch-manager';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await renewExpiringWatches();
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to renew watches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
