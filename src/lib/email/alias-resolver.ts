import { query } from '../db';

interface ParsedHeaders {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  date: string;
  messageId: string;
  inReplyTo: string;
  references: string;
  deliveredTo: string;
  xOriginalTo: string;
  xGmOriginalTo: string;
}

/**
 * Determine which alias (or dept address) received this email,
 * checking Gmail-specific headers in priority order.
 */
export async function determineRecipientAlias(
  headers: ParsedHeaders,
  accountId: number
): Promise<string | null> {
  // Priority: X-Gm-Original-To > Delivered-To > X-Original-To > match To/Cc
  const candidates: string[] = [];

  if (headers.xGmOriginalTo) candidates.push(headers.xGmOriginalTo.toLowerCase());
  if (headers.deliveredTo) candidates.push(headers.deliveredTo.toLowerCase());
  if (headers.xOriginalTo) candidates.push(headers.xOriginalTo.toLowerCase());

  // Add To and Cc addresses
  for (const addr of [...headers.to, ...headers.cc]) {
    const email = extractEmail(addr);
    if (email) candidates.push(email.toLowerCase());
  }

  if (candidates.length === 0) return null;

  // Load all known aliases for this account
  const aliasResult = await query(
    `SELECT alias_address FROM email_aliases WHERE account_id = $1 AND is_active = true
     UNION
     SELECT email_address FROM email_accounts WHERE id = $1`,
    [accountId]
  );
  const knownAddresses = new Set(aliasResult.rows.map((r: { alias_address?: string; email_address?: string }) =>
    (r.alias_address || r.email_address || '').toLowerCase()
  ));

  // Return first candidate that matches a known alias/account
  for (const candidate of candidates) {
    if (knownAddresses.has(candidate)) return candidate;
  }

  // Fallback: return the account's own email
  const account = await query('SELECT email_address FROM email_accounts WHERE id = $1', [accountId]);
  return account.rows[0]?.email_address || null;
}

/**
 * Get the user assigned to a given alias or the default assignee for the account.
 */
export async function getAssignedUser(
  deliveredTo: string | null,
  accountId: number
): Promise<{ id: number; name: string } | null> {
  if (deliveredTo) {
    const result = await query(
      `SELECT ea.assigned_user_id, su.first_name || ' ' || su.last_name as full_name
       FROM email_aliases ea
       JOIN staff_users su ON su.id = ea.assigned_user_id
       WHERE ea.alias_address = $1 AND ea.account_id = $2 AND ea.is_active = true`,
      [deliveredTo.toLowerCase(), accountId]
    );
    if (result.rows.length > 0 && result.rows[0].assigned_user_id) {
      return { id: result.rows[0].assigned_user_id, name: result.rows[0].full_name };
    }
  }

  // Fall back to account default
  const account = await query(
    `SELECT ea.auto_assign_default_user_id, su.first_name || ' ' || su.last_name as full_name
     FROM email_accounts ea
     LEFT JOIN staff_users su ON su.id = ea.auto_assign_default_user_id
     WHERE ea.id = $1`,
    [accountId]
  );
  if (account.rows[0]?.auto_assign_default_user_id) {
    return { id: account.rows[0].auto_assign_default_user_id, name: account.rows[0].full_name };
  }

  return null;
}

function extractEmail(address: string): string | null {
  const match = address.match(/<([^>]+)>/);
  if (match) return match[1];
  if (address.includes('@')) return address.trim();
  return null;
}

export function parseHeaderValue(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

export function parseAddressList(value: string): string[] {
  if (!value) return [];
  return value.split(',').map(a => a.trim()).filter(Boolean);
}

export function extractHeaders(gmailHeaders: Array<{ name: string; value: string }>): ParsedHeaders {
  return {
    from: parseHeaderValue(gmailHeaders, 'From'),
    to: parseAddressList(parseHeaderValue(gmailHeaders, 'To')),
    cc: parseAddressList(parseHeaderValue(gmailHeaders, 'Cc')),
    bcc: parseAddressList(parseHeaderValue(gmailHeaders, 'Bcc')),
    subject: parseHeaderValue(gmailHeaders, 'Subject'),
    date: parseHeaderValue(gmailHeaders, 'Date'),
    messageId: parseHeaderValue(gmailHeaders, 'Message-ID'),
    inReplyTo: parseHeaderValue(gmailHeaders, 'In-Reply-To'),
    references: parseHeaderValue(gmailHeaders, 'References'),
    deliveredTo: parseHeaderValue(gmailHeaders, 'Delivered-To'),
    xOriginalTo: parseHeaderValue(gmailHeaders, 'X-Original-To'),
    xGmOriginalTo: parseHeaderValue(gmailHeaders, 'X-Gm-Original-To'),
  };
}
