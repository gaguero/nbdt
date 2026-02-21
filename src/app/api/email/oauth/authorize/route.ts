import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { getAuthUrl } from '@/lib/email/gmail-auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Verify account exists
    const account = await query(
      'SELECT id, email_address FROM email_accounts WHERE id = $1',
      [accountId]
    );
    if (account.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const state = JSON.stringify({
      accountId,
      userId: authResult.userId,
    });

    const encodedState = Buffer.from(state).toString('base64url');
    const authUrl = getAuthUrl(encodedState);

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate auth URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
