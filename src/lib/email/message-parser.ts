import { gmail_v1 } from 'googleapis';

interface ParsedBody {
  text: string;
  html: string;
}

interface AttachmentMeta {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Recursively walk MIME parts to extract text and HTML body.
 */
export function parseBody(payload: gmail_v1.Schema$MessagePart): ParsedBody {
  const result: ParsedBody = { text: '', html: '' };

  if (!payload) return result;

  function walkParts(part: gmail_v1.Schema$MessagePart) {
    const mimeType = part.mimeType || '';

    // Leaf node with body data
    if (part.body?.data && !part.parts) {
      const decoded = Buffer.from(part.body.data, 'base64url').toString('utf8');
      if (mimeType === 'text/plain' && !result.text) {
        result.text = decoded;
      } else if (mimeType === 'text/html' && !result.html) {
        result.html = decoded;
      }
      return;
    }

    // Recurse into multipart
    if (part.parts) {
      for (const child of part.parts) {
        walkParts(child);
      }
    }
  }

  walkParts(payload);
  return result;
}

/**
 * Extract attachment metadata from MIME parts (without downloading content).
 */
export function extractAttachmentMetadata(payload: gmail_v1.Schema$MessagePart): AttachmentMeta[] {
  const attachments: AttachmentMeta[] = [];

  function walkParts(part: gmail_v1.Schema$MessagePart) {
    if (part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename || 'unnamed',
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
      });
    }

    if (part.parts) {
      for (const child of part.parts) {
        walkParts(child);
      }
    }
  }

  walkParts(payload);
  return attachments;
}

/**
 * Parse address string into { email, name } objects.
 */
export function parseAddressToJson(address: string): { email: string; name?: string } {
  const match = address.match(/^"?([^"<]*)"?\s*<([^>]+)>/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: address.trim() };
}

export function parseAddressListToJson(value: string): Array<{ email: string; name?: string }> {
  if (!value) return [];
  return value.split(',').map(a => a.trim()).filter(Boolean).map(parseAddressToJson);
}

/**
 * Extract the "from" name and email from a From header.
 */
export function parseFromHeader(from: string): { address: string; name: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<([^>]+)>/);
  if (match) {
    return { name: match[1].trim(), address: match[2].trim() };
  }
  return { name: '', address: from.trim() };
}
