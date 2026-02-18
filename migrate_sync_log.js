require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS opera_sync_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        synced_at timestamptz NOT NULL DEFAULT NOW(),
        emails_found integer NOT NULL DEFAULT 0,
        xmls_processed integer NOT NULL DEFAULT 0,
        reservations_created integer NOT NULL DEFAULT 0,
        reservations_updated integer NOT NULL DEFAULT 0,
        errors jsonb NOT NULL DEFAULT '[]',
        triggered_by text NOT NULL DEFAULT 'cron'
      )
    `);
    console.log('opera_sync_log table created');
    await pool.end();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    client.release();
  }
}
run();
