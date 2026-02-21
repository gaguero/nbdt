import { google, gmail_v1 } from 'googleapis';
import { getAuthenticatedClient } from './gmail-auth';
import { query } from '../db';

export async function getGmailClient(accountId: number): Promise<gmail_v1.Gmail> {
  const auth = await getAuthenticatedClient(accountId);
  return google.gmail({ version: 'v1', auth });
}

export async function withGmailClient<T>(
  accountId: number,
  operation: (gmail: gmail_v1.Gmail) => Promise<T>
): Promise<T> {
  const gmail = await getGmailClient(accountId);
  try {
    return await operation(gmail);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      await query(
        `UPDATE email_accounts
         SET sync_status = 'error',
             sync_error = 'Token invalid. Please re-authorize.',
             updated_at = NOW()
         WHERE id = $1`,
        [accountId]
      );
      throw new Error('Re-authorization required');
    }
    throw error;
  }
}

function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as { code?: number; status?: number; message?: string };
    return e.code === 401 || e.status === 401 ||
           (typeof e.message === 'string' && e.message.includes('invalid_grant'));
  }
  return false;
}

export async function getAccountProfile(accountId: number): Promise<{ emailAddress: string; historyId: string }> {
  const gmail = await getGmailClient(accountId);
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return {
    emailAddress: profile.data.emailAddress || '',
    historyId: profile.data.historyId || '',
  };
}
