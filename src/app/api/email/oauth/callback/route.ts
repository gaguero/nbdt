import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, storeTokens } from '@/lib/email/gmail-auth';
import { getGmailClient } from '@/lib/email/gmail-client';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  // Determine locale for redirect (default to 'en')
  const locale = 'en';
  const settingsUrl = `/${locale}/staff/settings`;

  if (error) {
    const url = new URL(settingsUrl, request.url);
    url.searchParams.set('emailError', `Google authorization denied: ${error}`);
    return NextResponse.redirect(url);
  }

  if (!code || !stateParam) {
    const url = new URL(settingsUrl, request.url);
    url.searchParams.set('emailError', 'Missing authorization code');
    return NextResponse.redirect(url);
  }

  try {
    // Decode state
    const stateJson = Buffer.from(stateParam, 'base64url').toString('utf8');
    const state = JSON.parse(stateJson) as { accountId: number; userId: string };

    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Store encrypted tokens
    await storeTokens(state.accountId, tokens);

    // Verify access by getting profile
    const gmail = await getGmailClient(state.accountId);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;
    const historyId = profile.data.historyId;

    // Update account with verified email and initial history ID
    await query(
      `UPDATE email_accounts
       SET email_address = COALESCE($1, email_address),
           last_history_id = $2,
           sync_status = 'active',
           last_sync_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [emailAddress, historyId, state.accountId]
    );

    const url = new URL(settingsUrl, request.url);
    url.searchParams.set('emailSuccess', `Connected ${emailAddress} successfully`);
    return NextResponse.redirect(url);
  } catch (err: unknown) {
    console.error('OAuth callback error:', err);
    const url = new URL(settingsUrl, request.url);
    const message = err instanceof Error ? err.message : 'Authorization failed';
    url.searchParams.set('emailError', message);
    return NextResponse.redirect(url);
  }
}
