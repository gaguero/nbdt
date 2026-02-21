import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getGmailClient } from './gmail-client';
import { query } from '../db';

const MAX_DB_SIZE = parseInt(process.env.EMAIL_ATTACHMENT_MAX_DB_SIZE || '5242880', 10); // 5MB
const DISK_PATH = process.env.EMAIL_ATTACHMENT_DISK_PATH || '/data/email-attachments';

/**
 * Download an attachment on-demand (lazy download strategy).
 * First checks if already downloaded, then fetches from Gmail if needed.
 */
export async function downloadAttachment(attachmentDbId: number): Promise<{
  content: Buffer;
  filename: string;
  mimeType: string;
}> {
  const att = await query(
    `SELECT ea.*, em.gmail_message_id, em.account_id
     FROM email_attachments ea
     JOIN email_messages em ON em.id = ea.message_id
     WHERE ea.id = $1`,
    [attachmentDbId]
  );

  if (att.rows.length === 0) {
    throw new Error('Attachment not found');
  }

  const row = att.rows[0];

  // Already cached in DB
  if (row.storage_type === 'db' && row.content_base64) {
    return {
      content: Buffer.from(row.content_base64, 'base64'),
      filename: row.filename,
      mimeType: row.mime_type,
    };
  }

  // Already cached on disk
  if (row.storage_type === 'disk' && row.file_path) {
    try {
      const content = await fs.readFile(row.file_path);
      return { content, filename: row.filename, mimeType: row.mime_type };
    } catch {
      // File may have been cleaned up — re-download
    }
  }

  // Fetch from Gmail API
  const gmail = await getGmailClient(row.account_id);
  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: row.gmail_message_id,
    id: row.gmail_attachment_id,
  });

  if (!response.data.data) {
    throw new Error('Gmail returned empty attachment data');
  }

  const content = Buffer.from(response.data.data, 'base64url');
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  // Store based on size
  if (content.length < MAX_DB_SIZE) {
    await query(
      `UPDATE email_attachments
       SET content_base64 = $1, storage_type = 'db', content_hash = $2
       WHERE id = $3`,
      [content.toString('base64'), contentHash, attachmentDbId]
    );
  } else {
    const dir = path.join(DISK_PATH, String(row.account_id));
    await fs.mkdir(dir, { recursive: true });
    const safeFilename = row.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(dir, `${attachmentDbId}_${safeFilename}`);
    await fs.writeFile(filePath, content);

    await query(
      `UPDATE email_attachments
       SET file_path = $1, storage_type = 'disk', content_hash = $2
       WHERE id = $3`,
      [filePath, contentHash, attachmentDbId]
    );
  }

  return { content, filename: row.filename, mimeType: row.mime_type };
}

/**
 * Get attachment metadata for a message.
 */
export async function getAttachmentsForMessage(messageId: number): Promise<Array<{
  id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_type: string;
}>> {
  const result = await query(
    `SELECT id, filename, mime_type, size_bytes, storage_type
     FROM email_attachments WHERE message_id = $1 ORDER BY id ASC`,
    [messageId]
  );
  return result.rows;
}

/**
 * Determine the Content-Disposition for serving an attachment.
 */
export function getContentDisposition(mimeType: string, filename: string): string {
  const inlineTypes = [
    'image/', 'application/pdf', 'text/plain', 'text/html',
  ];
  const isInline = inlineTypes.some(t => mimeType.startsWith(t));
  const disposition = isInline ? 'inline' : 'attachment';
  const safeFilename = filename.replace(/"/g, '\\"');
  return `${disposition}; filename="${safeFilename}"`;
}
