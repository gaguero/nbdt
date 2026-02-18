import { google } from 'googleapis';

export interface GmailSyncResult {
  messagesFound: number;
  xmlsProcessed: string[];
  errors: string[];
}

const LOG = (msg: string, data?: any) => {
  const ts = new Date().toISOString();
  if (data !== undefined) console.log(`[gmail-sync ${ts}] ${msg}`, data);
  else console.log(`[gmail-sync ${ts}] ${msg}`);
};

function getGmailClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const impersonateUser = process.env.GMAIL_USER_EMAIL;

  LOG(`Config: email=${email ? '✓' : '✗ MISSING'}, key=${rawKey ? `set (${rawKey.length} chars)` : '✗ MISSING'}, user=${impersonateUser ?? '✗ MISSING'}`);

  if (!email || !rawKey || !impersonateUser) {
    throw new Error(
      `Missing env vars — GOOGLE_SERVICE_ACCOUNT_EMAIL:${email ? 'OK' : 'MISSING'} GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:${rawKey ? 'OK' : 'MISSING'} GMAIL_USER_EMAIL:${impersonateUser ? 'OK' : 'MISSING'}`
    );
  }

  // Normalize the private key: handle literal \n, Windows CRLF, and missing PEM structure
  let privateKey = rawKey
    .replace(/\\n/g, '\n')   // literal \n → real newline
    .replace(/\r\n/g, '\n')  // CRLF → LF
    .replace(/\r/g, '\n')    // CR → LF
    .trim();

  // Ensure PEM headers are present (sometimes stripped when copying)
  if (!privateKey.includes('-----BEGIN')) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }

  LOG(`Private key: starts="${privateKey.substring(0, 30)}..." lines=${privateKey.split('\n').length}`);

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

  LOG(`Starting fetch — label="${label}" user=${process.env.GMAIL_USER_EMAIL}`);

  let gmail: ReturnType<typeof google.gmail>;
  try {
    gmail = getGmailClient();
    LOG('Gmail client created');
  } catch (err: any) {
    LOG(`Failed to create Gmail client: ${err.message}`);
    throw err;
  }

  LOG(`Searching for unread messages with label:${label} has:attachment`);
  const listRes = await gmail.users.messages.list({
    userId,
    q: `label:${label} is:unread has:attachment`,
    maxResults: 20,
  });

  const messages = listRes.data.messages ?? [];
  result.messagesFound = messages.length;
  LOG(`Found ${messages.length} unread message(s)`);

  for (const msg of messages) {
    const msgId = msg.id!;
    LOG(`Processing message ${msgId}`);
    try {
      const fullMsg = await gmail.users.messages.get({ userId, id: msgId, format: 'full' });
      const parts = fullMsg.data.payload?.parts ?? [];
      LOG(`  Message has ${parts.length} part(s): ${parts.map(p => p.filename || p.mimeType).join(', ')}`);

      let foundXml = false;
      for (const part of parts) {
        const filename = part.filename ?? '';
        const mimeType = part.mimeType ?? '';

        if (!filename.toLowerCase().endsWith('.xml') && !mimeType.includes('xml')) {
          LOG(`  Skipping part: filename="${filename}" mimeType="${mimeType}"`);
          continue;
        }

        LOG(`  Found XML part: filename="${filename}" mimeType="${mimeType}"`);
        const attachmentId = part.body?.attachmentId;

        if (!attachmentId) {
          const data = part.body?.data;
          if (data) {
            const xml = Buffer.from(data, 'base64').toString('utf-8');
            result.xmlsProcessed.push(xml);
            foundXml = true;
            LOG(`  Decoded inline XML (${xml.length} chars)`);
          }
          continue;
        }

        const attRes = await gmail.users.messages.attachments.get({
          userId,
          messageId: msgId,
          id: attachmentId,
        });

        const data = attRes.data.data;
        if (!data) { LOG(`  Attachment data empty, skipping`); continue; }

        const xml = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
        result.xmlsProcessed.push(xml);
        foundXml = true;
        LOG(`  Downloaded attachment XML (${xml.length} chars)`);
      }

      if (foundXml) {
        await gmail.users.messages.modify({
          userId,
          id: msgId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
        LOG(`  Marked message ${msgId} as read`);
      } else {
        LOG(`  No XML found in message ${msgId}`);
      }
    } catch (err: any) {
      LOG(`  Error processing message ${msgId}: ${err.message}`);
      result.errors.push(`Message ${msgId}: ${err.message}`);
    }
  }

  LOG(`Done — ${result.xmlsProcessed.length} XML(s) collected, ${result.errors.length} error(s)`);
  return result;
}
