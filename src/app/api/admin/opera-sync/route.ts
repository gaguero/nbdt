import { NextRequest, NextResponse } from 'next/server';
import { query, queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { fetchOperaXmlAttachments } from '@/lib/opera/gmail-sync';
import { importOperaXml } from '@/lib/opera/xml-import';

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('x-cron-secret') === secret;
}

function isStaffAuthorized(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const user = verifyToken(token);
    return ['admin', 'manager'].includes(user.role);
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/opera-sync
 * Returns recent sync log entries (staff admin only).
 */
export async function GET(request: NextRequest) {
  if (!isStaffAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await queryMany(
    `SELECT id, synced_at, emails_found, xmls_processed,
            reservations_created, reservations_updated, errors, triggered_by
     FROM opera_sync_log
     ORDER BY synced_at DESC
     LIMIT 20`
  );

  return NextResponse.json({ logs });
}

/**
 * POST /api/admin/opera-sync
 * Fetches unread Opera XMLs from Gmail and imports them.
 * Authorized by either:
 *   - x-cron-secret header (Railway cron)
 *   - Staff session cookie (manual trigger from settings page)
 */
export async function POST(request: NextRequest) {
  const triggeredBy = isCronAuthorized(request)
    ? 'cron'
    : isStaffAuthorized(request)
    ? 'manual'
    : null;

  if (!triggeredBy) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const LOG = (msg: string) => console.log(`[opera-sync ${new Date().toISOString()}] [${triggeredBy}] ${msg}`);

  const summary = {
    emails_found: 0,
    xmls_processed: 0,
    reservations_created: 0,
    reservations_updated: 0,
    errors: [] as string[],
  };

  LOG('Starting Opera sync');

  try {
    LOG('Fetching XML attachments from Gmail...');
    const gmailResult = await fetchOperaXmlAttachments();
    summary.emails_found = gmailResult.messagesFound;
    summary.errors.push(...gmailResult.errors);
    LOG(`Gmail fetch complete — ${gmailResult.messagesFound} email(s), ${gmailResult.xmlsProcessed.length} XML(s), ${gmailResult.errors.length} error(s)`);

    for (let i = 0; i < gmailResult.xmlsProcessed.length; i++) {
      const xml = gmailResult.xmlsProcessed[i];
      LOG(`Importing XML ${i + 1}/${gmailResult.xmlsProcessed.length} (${xml.length} chars)...`);
      try {
        const importResult = await importOperaXml(xml);
        summary.xmls_processed++;
        summary.reservations_created += importResult.created ?? 0;
        summary.reservations_updated += importResult.updated ?? 0;
        LOG(`XML ${i + 1} imported — created:${importResult.created} updated:${importResult.updated} errors:${importResult.errors?.length ?? 0}`);
        if (importResult.errors?.length) {
          summary.errors.push(...importResult.errors);
          LOG(`XML ${i + 1} import errors: ${importResult.errors.slice(0, 5).join(' | ')}`);
        }
      } catch (err: any) {
        LOG(`XML ${i + 1} import failed: ${err.message}`);
        summary.errors.push(`XML import failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    LOG(`Gmail fetch failed: ${err.message}`);
    summary.errors.push(`Gmail fetch failed: ${err.message}`);
  }

  LOG(`Sync complete — emails:${summary.emails_found} xmls:${summary.xmls_processed} created:${summary.reservations_created} updated:${summary.reservations_updated} errors:${summary.errors.length}`);

  // Write to sync log
  await query(
    `INSERT INTO opera_sync_log
       (emails_found, xmls_processed, reservations_created, reservations_updated, errors, triggered_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      summary.emails_found,
      summary.xmls_processed,
      summary.reservations_created,
      summary.reservations_updated,
      JSON.stringify(summary.errors),
      triggeredBy,
    ]
  );

  return NextResponse.json({ summary });
}
