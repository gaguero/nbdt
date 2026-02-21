import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { incrementalSync } from '@/lib/email/sync-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Pub/Sub message format
    if (!body.message?.data) {
      return new NextResponse('OK', { status: 200 });
    }

    // Decode the notification data
    const dataStr = Buffer.from(body.message.data, 'base64').toString('utf8');
    const data = JSON.parse(dataStr) as { emailAddress: string; historyId: string };

    // Find the account
    const account = await query(
      'SELECT id FROM email_accounts WHERE email_address = $1 AND is_active = true',
      [data.emailAddress]
    );

    if (account.rows.length === 0) {
      // Acknowledge to stop retries
      return new NextResponse('OK', { status: 200 });
    }

    // Trigger incremental sync (non-blocking)
    incrementalSync(account.rows[0].id, 'push').catch(err => {
      console.error(`Push sync failed for ${data.emailAddress}:`, err);
    });

    // Acknowledge immediately
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Pub/Sub retries on parse errors
    return new NextResponse('OK', { status: 200 });
  }
}
