import { google } from 'googleapis';

export interface GmailSyncResult {
  messagesFound: number;
  xmlsProcessed: string[];
  errors: string[];
}

function getGmailClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const impersonateUser = process.env.GMAIL_USER_EMAIL;

  if (!email || !rawKey || !impersonateUser) {
    throw new Error(
      'Missing Gmail service account env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GMAIL_USER_EMAIL'
    );
  }

  // Railway env vars store the private key with literal \n — convert to real newlines
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    clientOptions: { subject: impersonateUser },
  });

  return google.gmail({ version: 'v1', auth });
}

/**
 * Fetches all unread XML attachments from emails with the configured label.
 * Marks each processed email as read to avoid re-processing.
 */
export async function fetchOperaXmlAttachments(): Promise<GmailSyncResult> {
  const result: GmailSyncResult = { messagesFound: 0, xmlsProcessed: [], errors: [] };
  const label = process.env.OPERA_GMAIL_LABEL || 'Opera_revs_update';
  const userId = 'me';

  const gmail = getGmailClient();

  // Search: unread messages with the target label that have attachments
  const listRes = await gmail.users.messages.list({
    userId,
    q: `label:${label} is:unread has:attachment`,
    maxResults: 20,
  });

  const messages = listRes.data.messages ?? [];
  result.messagesFound = messages.length;

  for (const msg of messages) {
    const msgId = msg.id!;
    try {
      const fullMsg = await gmail.users.messages.get({ userId, id: msgId, format: 'full' });
      const parts = fullMsg.data.payload?.parts ?? [];

      let foundXml = false;
      for (const part of parts) {
        const filename = part.filename ?? '';
        const mimeType = part.mimeType ?? '';

        if (!filename.toLowerCase().endsWith('.xml') && !mimeType.includes('xml')) continue;

        const attachmentId = part.body?.attachmentId;
        if (!attachmentId) {
          // Inline XML in body data
          const data = part.body?.data;
          if (data) {
            const xml = Buffer.from(data, 'base64').toString('utf-8');
            result.xmlsProcessed.push(xml);
            foundXml = true;
          }
          continue;
        }

        const attRes = await gmail.users.messages.attachments.get({
          userId,
          messageId: msgId,
          id: attachmentId,
        });

        const data = attRes.data.data;
        if (!data) continue;

        // Gmail uses URL-safe base64
        const xml = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
        result.xmlsProcessed.push(xml);
        foundXml = true;
      }

      if (foundXml) {
        // Mark as read so it's not re-processed next run
        await gmail.users.messages.modify({
          userId,
          id: msgId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
      }
    } catch (err: any) {
      result.errors.push(`Message ${msgId}: ${err.message}`);
    }
  }

  return result;
}
