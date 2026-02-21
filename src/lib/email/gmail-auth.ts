import { google } from 'googleapis';
import { query } from '../db';
import { encryptToken, decryptToken } from '../encryption';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth2 credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
}> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google. Ensure prompt=consent is used.');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    scope: tokens.scope || SCOPES.join(' '),
  };
}

export async function storeTokens(
  accountId: number,
  tokens: { access_token: string; refresh_token: string; expiry_date: number; scope: string }
): Promise<void> {
  const encryptedAccess = encryptToken(tokens.access_token);
  const encryptedRefresh = encryptToken(tokens.refresh_token);

  await query(
    `UPDATE email_accounts
     SET access_token = $1,
         refresh_token = $2,
         token_expiry = to_timestamp($3 / 1000.0),
         oauth_scopes = $4,
         sync_status = 'active',
         sync_error = NULL,
         updated_at = NOW()
     WHERE id = $5`,
    [encryptedAccess, encryptedRefresh, tokens.expiry_date, tokens.scope, accountId]
  );
}

export async function getAuthenticatedClient(accountId: number) {
  const result = await query(
    `SELECT access_token, refresh_token, token_expiry
     FROM email_accounts WHERE id = $1`,
    [accountId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Email account ${accountId} not found`);
  }

  const row = result.rows[0];
  if (!row.access_token || !row.refresh_token) {
    throw new Error(`Email account ${accountId} has no OAuth tokens. Please re-authorize.`);
  }

  const accessToken = decryptToken(row.access_token);
  const refreshToken = decryptToken(row.refresh_token);
  const expiryDate = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate,
  });

  // Auto-refresh if expired
  if (expiryDate < Date.now() + 60000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        const newEncrypted = encryptToken(credentials.access_token);
        await query(
          `UPDATE email_accounts
           SET access_token = $1,
               token_expiry = to_timestamp($2 / 1000.0),
               updated_at = NOW()
           WHERE id = $3`,
          [newEncrypted, credentials.expiry_date, accountId]
        );
        oauth2Client.setCredentials(credentials);
      }
    } catch (err) {
      await query(
        `UPDATE email_accounts
         SET sync_status = 'error',
             sync_error = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['Token refresh failed. Please re-authorize.', accountId]
      );
      throw new Error('Token refresh failed. Please re-authorize this account.');
    }
  }

  return oauth2Client;
}

export async function revokeAccess(accountId: number): Promise<void> {
  try {
    const oauth2Client = await getAuthenticatedClient(accountId);
    const token = oauth2Client.credentials.access_token;
    if (token) {
      await oauth2Client.revokeToken(token);
    }
  } catch {
    // Ignore revoke errors — we still want to clean up locally
  }

  await query(
    `UPDATE email_accounts
     SET access_token = NULL,
         refresh_token = NULL,
         token_expiry = NULL,
         sync_status = 'disconnected',
         sync_error = NULL,
         last_history_id = NULL,
         watch_expiration = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [accountId]
  );
}
