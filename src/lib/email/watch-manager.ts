import { getGmailClient } from './gmail-client';
import { query } from '../db';

/**
 * Set up Gmail push notifications (watch) for an account.
 * Must be renewed every 7 days — we renew every 6 hours for safety.
 */
export async function setupWatch(accountId: number): Promise<void> {
  const topic = process.env.PUBSUB_TOPIC;
  if (!topic) {
    console.log(`Pub/Sub topic not configured, skipping watch for account ${accountId}`);
    return;
  }

  const gmail = await getGmailClient(accountId);

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: topic,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'include',
    },
  });

  await query(
    `UPDATE email_accounts
     SET watch_expiration = to_timestamp($1 / 1000.0),
         pubsub_topic = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [response.data.expiration, topic, accountId]
  );
}

/**
 * Stop watching an account.
 */
export async function stopWatch(accountId: number): Promise<void> {
  try {
    const gmail = await getGmailClient(accountId);
    await gmail.users.stop({ userId: 'me' });
  } catch {
    // Ignore errors — watch may already be stopped
  }

  await query(
    `UPDATE email_accounts SET watch_expiration = NULL, updated_at = NOW() WHERE id = $1`,
    [accountId]
  );
}

/**
 * Renew watches that are expiring within 24 hours.
 * Called by cron every 6 hours.
 */
export async function renewExpiringWatches(): Promise<{ renewed: number; errors: number }> {
  const accounts = await query(
    `SELECT id, email_address FROM email_accounts
     WHERE is_active = true
       AND sync_status = 'active'
       AND (watch_expiration IS NULL OR watch_expiration < NOW() + INTERVAL '24 hours')`
  );

  let renewed = 0;
  let errors = 0;

  for (const account of accounts.rows) {
    try {
      await setupWatch(account.id);
      renewed++;
    } catch (err) {
      console.error(`Failed to renew watch for ${account.email_address}:`, err);
      errors++;
    }
  }

  return { renewed, errors };
}
