/**
 * Railway Cron Job script — called every hour to sync Opera XMLs from Gmail.
 * Set as the Start Command on a Railway Cron service:
 *   node scripts/opera-sync-cron.mjs
 *
 * Required env vars on the cron service:
 *   APP_URL     — e.g. https://nayara-ordering-system.up.railway.app
 *   CRON_SECRET — matches CRON_SECRET on the main app service
 */

const appUrl = process.env.APP_URL?.trim();
const cronSecret = process.env.CRON_SECRET?.trim();

if (!appUrl || !cronSecret) {
  console.error('Missing APP_URL or CRON_SECRET env vars');
  process.exit(1);
}

console.log(`[opera-sync-cron] Triggering sync at ${new Date().toISOString()}`);

const res = await fetch(`${appUrl}/api/admin/opera-sync`, {
  method: 'POST',
  headers: { 'x-cron-secret': cronSecret },
});

const data = await res.json();

if (!res.ok) {
  console.error('[opera-sync-cron] Sync failed:', data);
  process.exit(1);
}

const s = data.summary;
console.log(
  `[opera-sync-cron] Done — ${s.emails_found} email(s), ${s.xmls_processed} XML(s), ` +
  `${s.reservations_created} created, ${s.reservations_updated} updated` +
  (s.errors.length ? `, ${s.errors.length} error(s): ${s.errors.join('; ')}` : '')
);
