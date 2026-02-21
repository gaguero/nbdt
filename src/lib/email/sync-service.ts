import { gmail_v1 } from 'googleapis';
import { getGmailClient } from './gmail-client';
import { query, transaction } from '../db';
import { extractHeaders, determineRecipientAlias, getAssignedUser } from './alias-resolver';
import { parseBody, extractAttachmentMetadata, parseAddressListToJson, parseFromHeader } from './message-parser';
import { autoLinkGuest } from './guest-linker';

const MAX_INITIAL_SYNC = parseInt(process.env.EMAIL_MAX_INITIAL_SYNC || '500', 10);

export interface SyncResult {
  messagesFetched: number;
  messagesNew: number;
  errors: number;
  historyIdEnd: string | null;
}

/**
 * Perform an initial sync for a newly-connected account.
 * Fetches recent messages from the inbox.
 */
export async function initialSync(accountId: number): Promise<SyncResult> {
  const logId = await startSyncLog(accountId, 'initial');
  const result: SyncResult = { messagesFetched: 0, messagesNew: 0, errors: 0, historyIdEnd: null };

  try {
    const gmail = await getGmailClient(accountId);
    let pageToken: string | undefined;
    let fetched = 0;

    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        q: 'in:inbox',
        pageToken,
      });

      const messages = response.data.messages || [];
      for (const msg of messages) {
        if (fetched >= MAX_INITIAL_SYNC) break;
        try {
          const isNew = await fetchAndStoreMessage(gmail, msg.id!, accountId);
          result.messagesFetched++;
          if (isNew) result.messagesNew++;
        } catch (err) {
          console.error(`Failed to sync message ${msg.id}:`, err);
          result.errors++;
        }
        fetched++;
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken && fetched < MAX_INITIAL_SYNC);

    // Get current historyId
    const profile = await gmail.users.getProfile({ userId: 'me' });
    result.historyIdEnd = profile.data.historyId || null;

    await query(
      `UPDATE email_accounts SET last_history_id = $1, last_sync_at = NOW(), sync_status = 'active', updated_at = NOW() WHERE id = $2`,
      [result.historyIdEnd, accountId]
    );

    await completeSyncLog(logId, result, null);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    await completeSyncLog(logId, result, errMsg);
    throw err;
  }

  return result;
}

/**
 * Incremental sync using Gmail History API.
 * Called by cron and push webhook.
 */
export async function incrementalSync(accountId: number, syncType: 'cron' | 'push' | 'manual'): Promise<SyncResult> {
  const logId = await startSyncLog(accountId, syncType);
  const result: SyncResult = { messagesFetched: 0, messagesNew: 0, errors: 0, historyIdEnd: null };

  try {
    const accountRow = await query(
      'SELECT last_history_id, email_address FROM email_accounts WHERE id = $1',
      [accountId]
    );

    if (!accountRow.rows[0]?.last_history_id) {
      // No history ID — need initial sync instead
      const initialResult = await initialSync(accountId);
      await completeSyncLog(logId, initialResult, null);
      return initialResult;
    }

    const startHistoryId = accountRow.rows[0].last_history_id;
    const gmail = await getGmailClient(accountId);

    let pageToken: string | undefined;
    let latestHistoryId = startHistoryId;

    do {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded', 'labelAdded', 'labelRemoved'],
        pageToken,
      });

      latestHistoryId = response.data.historyId || latestHistoryId;
      const historyRecords = response.data.history || [];

      for (const record of historyRecords) {
        // New messages added
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            if (!added.message?.id) continue;
            try {
              const isNew = await fetchAndStoreMessage(gmail, added.message.id, accountId);
              result.messagesFetched++;
              if (isNew) result.messagesNew++;
            } catch (err) {
              console.error(`Failed to sync message ${added.message.id}:`, err);
              result.errors++;
            }
          }
        }

        // Label changes on existing messages
        if (record.labelsAdded) {
          for (const change of record.labelsAdded) {
            if (change.message?.id) {
              await updateMessageLabels(change.message.id, change.labelIds || [], 'add');
            }
          }
        }
        if (record.labelsRemoved) {
          for (const change of record.labelsRemoved) {
            if (change.message?.id) {
              await updateMessageLabels(change.message.id, change.labelIds || [], 'remove');
            }
          }
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    result.historyIdEnd = latestHistoryId;

    await query(
      `UPDATE email_accounts SET last_history_id = $1, last_sync_at = NOW(), sync_status = 'active', sync_error = NULL, updated_at = NOW() WHERE id = $2`,
      [latestHistoryId, accountId]
    );

    await completeSyncLog(logId, result, null);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    // If historyId is invalid (expired), do a full re-sync
    if (errMsg.includes('historyId') || errMsg.includes('404')) {
      console.log(`History ID expired for account ${accountId}, performing initial sync`);
      try {
        const initialResult = await initialSync(accountId);
        await completeSyncLog(logId, initialResult, null);
        return initialResult;
      } catch (initErr) {
        const initErrMsg = initErr instanceof Error ? initErr.message : 'Unknown error';
        await completeSyncLog(logId, result, initErrMsg);
        throw initErr;
      }
    }

    await query(
      `UPDATE email_accounts SET sync_error = $1, updated_at = NOW() WHERE id = $2`,
      [errMsg, accountId]
    );
    await completeSyncLog(logId, result, errMsg);
    throw err;
  }

  return result;
}

/**
 * Fetch a single message from Gmail and store it in the database.
 * Returns true if the message was newly inserted, false if it already existed.
 */
async function fetchAndStoreMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  accountId: number
): Promise<boolean> {
  // Check if already exists
  const existing = await query(
    'SELECT id FROM email_messages WHERE gmail_message_id = $1',
    [messageId]
  );
  if (existing.rows.length > 0) return false;

  // Fetch full message
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  if (!msg.data.payload) return false;

  const gmailHeaders = (msg.data.payload.headers || []) as Array<{ name: string; value: string }>;
  const headers = extractHeaders(gmailHeaders);
  const fromParsed = parseFromHeader(headers.from);
  const toJson = parseAddressListToJson(headers.to.join(', '));
  const ccJson = parseAddressListToJson(headers.cc.join(', '));
  const bccJson = parseAddressListToJson(headers.bcc.join(', '));

  // Determine recipient alias
  const deliveredTo = await determineRecipientAlias(headers, accountId);
  const assignedUser = await getAssignedUser(deliveredTo, accountId);

  // Parse body
  const { text, html } = parseBody(msg.data.payload);

  // Extract attachments metadata
  const attachments = extractAttachmentMetadata(msg.data.payload);

  const gmailLabels = msg.data.labelIds || [];
  const internalDate = msg.data.internalDate
    ? new Date(parseInt(msg.data.internalDate)).toISOString()
    : new Date().toISOString();

  // Determine direction
  const accountEmail = await query('SELECT email_address FROM email_accounts WHERE id = $1', [accountId]);
  const acctAddr = accountEmail.rows[0]?.email_address?.toLowerCase() || '';
  const isSent = gmailLabels.includes('SENT') || fromParsed.address.toLowerCase() === acctAddr;
  const direction = isSent ? 'outbound' : 'inbound';

  await transaction(async (client) => {
    // Upsert thread
    const threadResult = await client.query(
      `INSERT INTO email_threads (gmail_thread_id, account_id, subject, last_message_at, message_count, assigned_to, status)
       VALUES ($1, $2, $3, $4, 1, $5, 'open')
       ON CONFLICT (gmail_thread_id, account_id)
       DO UPDATE SET
         last_message_at = GREATEST(email_threads.last_message_at, EXCLUDED.last_message_at),
         message_count = email_threads.message_count + 1,
         assigned_to = COALESCE(email_threads.assigned_to, EXCLUDED.assigned_to),
         updated_at = NOW()
       RETURNING id`,
      [
        msg.data.threadId,
        accountId,
        headers.subject,
        internalDate,
        assignedUser?.id || null,
      ]
    );
    const threadId = threadResult.rows[0].id;

    // Insert message
    const messageResult = await client.query(
      `INSERT INTO email_messages (
         gmail_message_id, gmail_thread_id, account_id, thread_id,
         from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
         reply_to, subject, delivered_to, body_text, body_html, snippet,
         gmail_labels, gmail_internal_date, message_id_header,
         in_reply_to, references_header, assigned_to,
         is_read, is_sent, direction, has_attachments, attachment_count
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING id`,
      [
        msg.data.id,
        msg.data.threadId,
        accountId,
        threadId,
        fromParsed.address,
        fromParsed.name || null,
        JSON.stringify(toJson),
        JSON.stringify(ccJson),
        JSON.stringify(bccJson),
        headers.inReplyTo || null,
        headers.subject,
        deliveredTo,
        text || null,
        html || null,
        msg.data.snippet || null,
        gmailLabels,
        internalDate,
        headers.messageId || null,
        headers.inReplyTo || null,
        headers.references || null,
        assignedUser?.id || null,
        !gmailLabels.includes('UNREAD'),
        isSent,
        direction,
        attachments.length > 0,
        attachments.length,
      ]
    );
    const emailMessageId = messageResult.rows[0].id;

    // Insert attachment metadata
    for (const att of attachments) {
      await client.query(
        `INSERT INTO email_attachments (message_id, gmail_attachment_id, filename, mime_type, size_bytes, storage_type)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [emailMessageId, att.attachmentId, att.filename, att.mimeType, att.size]
      );
    }

    // Auto-link guest if inbound
    if (direction === 'inbound') {
      try {
        await autoLinkGuest(fromParsed.address, threadId, client);
      } catch {
        // Non-fatal
      }
    }
  });

  return true;
}

async function updateMessageLabels(
  gmailMessageId: string,
  labelIds: string[],
  action: 'add' | 'remove'
): Promise<void> {
  if (labelIds.length === 0) return;

  const existing = await query(
    'SELECT id, gmail_labels FROM email_messages WHERE gmail_message_id = $1',
    [gmailMessageId]
  );
  if (existing.rows.length === 0) return;

  const currentLabels: string[] = existing.rows[0].gmail_labels || [];
  let newLabels: string[];

  if (action === 'add') {
    newLabels = [...new Set([...currentLabels, ...labelIds])];
  } else {
    const removeSet = new Set(labelIds);
    newLabels = currentLabels.filter(l => !removeSet.has(l));
  }

  const isRead = !newLabels.includes('UNREAD');

  await query(
    'UPDATE email_messages SET gmail_labels = $1, is_read = $2 WHERE id = $3',
    [newLabels, isRead, existing.rows[0].id]
  );
}

async function startSyncLog(accountId: number, syncType: string): Promise<number> {
  const result = await query(
    `INSERT INTO email_sync_log (account_id, sync_type, started_at, status)
     VALUES ($1, $2, NOW(), 'running') RETURNING id`,
    [accountId, syncType]
  );
  return result.rows[0].id;
}

async function completeSyncLog(
  logId: number,
  result: SyncResult,
  errorDetails: string | null
): Promise<void> {
  await query(
    `UPDATE email_sync_log
     SET completed_at = NOW(),
         messages_fetched = $1,
         messages_new = $2,
         errors = $3,
         history_id_end = $4,
         error_details = $5,
         status = $6
     WHERE id = $7`,
    [
      result.messagesFetched,
      result.messagesNew,
      result.errors,
      result.historyIdEnd,
      errorDetails,
      errorDetails ? 'failed' : 'completed',
      logId,
    ]
  );
}

export async function getActiveAccounts(): Promise<Array<{ id: number; email_address: string }>> {
  const result = await query(
    `SELECT id, email_address FROM email_accounts WHERE is_active = true AND sync_status = 'active'`
  );
  return result.rows;
}
