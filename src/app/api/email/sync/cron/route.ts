import { NextRequest, NextResponse } from 'next/server';
import { getActiveAccounts, incrementalSync } from '@/lib/email/sync-service';
import { renewExpiringWatches } from '@/lib/email/watch-manager';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await getActiveAccounts();
  const results: Array<{ account: string; messagesFetched?: number; messagesNew?: number; error?: string }> = [];

  for (const account of accounts) {
    try {
      const result = await incrementalSync(account.id, 'cron');
      results.push({
        account: account.email_address,
        messagesFetched: result.messagesFetched,
        messagesNew: result.messagesNew,
      });
    } catch (error: unknown) {
      results.push({
        account: account.email_address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Also renew expiring watches
  let watchResult = { renewed: 0, errors: 0 };
  try {
    watchResult = await renewExpiringWatches();
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    results,
    watchesRenewed: watchResult.renewed,
    watchErrors: watchResult.errors,
    timestamp: new Date().toISOString(),
  });
}
