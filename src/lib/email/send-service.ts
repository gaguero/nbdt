import { getGmailClient } from './gmail-client';
import { query } from '../db';

interface SendEmailParams {
  accountId: number;
  fromAlias?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string; // Gmail thread ID
  nbdtThreadId?: number;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    contentBase64: string;
  }>;
  sentByUserId: number;
}

export async function sendEmail(params: SendEmailParams): Promise<{ gmailMessageId: string }> {
  const gmail = await getGmailClient(params.accountId);

  // Get account email for From header
  const accountResult = await query(
    'SELECT email_address, display_name FROM email_accounts WHERE id = $1',
    [params.accountId]
  );
  const fromEmail = params.fromAlias || accountResult.rows[0]?.email_address;
  const fromName = accountResult.rows[0]?.display_name || '';

  // Build MIME message
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `alt_${boundary}`;

  const headerLines = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: ${params.to.join(', ')}`,
    ...(params.cc?.length ? [`Cc: ${params.cc.join(', ')}`] : []),
    `Subject: ${params.subject}`,
    ...(params.inReplyTo ? [`In-Reply-To: ${params.inReplyTo}`] : []),
    ...(params.references ? [`References: ${params.references}`] : []),
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const bodyParts = [
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(params.bodyText, 'utf8').toString('base64'),
    '',
    `--${altBoundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(params.bodyHtml, 'utf8').toString('base64'),
    `--${altBoundary}--`,
  ];

  // Attachment parts
  const attachmentParts: string[] = [];
  if (params.attachments?.length) {
    for (const att of params.attachments) {
      attachmentParts.push(
        '',
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        att.contentBase64,
      );
    }
  }

  const mimeMessage = [
    ...headerLines,
    '',
    ...bodyParts,
    ...attachmentParts,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  // Encode for Gmail API
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId: params.threadId || undefined,
    },
  });

  const gmailMessageId = response.data.id!;

  // Store sent message in DB
  const toJson = params.to.map(email => ({ email }));
  const ccJson = (params.cc || []).map(email => ({ email }));

  const threadDbId = params.nbdtThreadId || await getOrCreateThread(
    params.threadId || gmailMessageId,
    params.accountId,
    params.subject,
    params.sentByUserId
  );

  await query(
    `INSERT INTO email_messages (
       gmail_message_id, gmail_thread_id, account_id, thread_id,
       from_address, from_name, to_addresses, cc_addresses,
       subject, body_text, body_html, snippet,
       gmail_labels, gmail_internal_date, assigned_to,
       is_read, is_sent, direction, has_attachments, attachment_count
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14,true,true,'outbound',$15,$16)`,
    [
      gmailMessageId,
      params.threadId || gmailMessageId,
      params.accountId,
      threadDbId,
      fromEmail,
      fromName,
      JSON.stringify(toJson),
      JSON.stringify(ccJson),
      params.subject,
      params.bodyText,
      params.bodyHtml,
      params.bodyText.substring(0, 200),
      ['SENT'],
      params.sentByUserId,
      (params.attachments?.length || 0) > 0,
      params.attachments?.length || 0,
    ]
  );

  // Update thread
  await query(
    `UPDATE email_threads SET last_message_at = NOW(), message_count = message_count + 1, updated_at = NOW() WHERE id = $1`,
    [threadDbId]
  );

  // Log activity
  await query(
    `INSERT INTO email_activity (thread_id, action, performed_by, details)
     VALUES ($1, 'replied', $2, $3)`,
    [threadDbId, params.sentByUserId, JSON.stringify({ to: params.to, subject: params.subject })]
  );

  return { gmailMessageId };
}

async function getOrCreateThread(
  gmailThreadId: string,
  accountId: number,
  subject: string,
  userId: number
): Promise<number> {
  const existing = await query(
    'SELECT id FROM email_threads WHERE gmail_thread_id = $1 AND account_id = $2',
    [gmailThreadId, accountId]
  );

  if (existing.rows.length > 0) return existing.rows[0].id;

  const result = await query(
    `INSERT INTO email_threads (gmail_thread_id, account_id, subject, last_message_at, message_count, assigned_to, status)
     VALUES ($1, $2, $3, NOW(), 0, $4, 'open') RETURNING id`,
    [gmailThreadId, accountId, subject, userId]
  );

  return result.rows[0].id;
}

/**
 * List "Send As" addresses configured in the Gmail account.
 */
export async function listSendAsAddresses(accountId: number): Promise<Array<{
  sendAsEmail: string;
  displayName: string;
  isDefault: boolean;
}>> {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.settings.sendAs.list({ userId: 'me' });

  return (response.data.sendAs || []).map(sa => ({
    sendAsEmail: sa.sendAsEmail || '',
    displayName: sa.displayName || '',
    isDefault: sa.isDefault || false,
  }));
}
