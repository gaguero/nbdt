'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running database migrations...');

    const schemaFiles = ['schema.sql', 'schema-v2.sql'];

    for (const file of schemaFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log('Skipping (not found):', file);
        continue;
      }
      console.log('Applying:', file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Split into individual statements and run each one separately so
      // an "already exists" error on one statement does not abort the rest.
      const statements = sql
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let applied = 0;
      let skipped = 0;
      for (const stmt of statements) {
        try {
          await pool.query(stmt);
          applied++;
        } catch (err) {
          if (
            err.code === '42P07' ||
            err.code === '42701' ||
            (err.message && err.message.includes('already exists'))
          ) {
            skipped++;
          } else {
            console.error('Statement failed:', stmt.substring(0, 80));
            throw err;
          }
        }
      }
      console.log(`Done: ${file} (${applied} applied, ${skipped} skipped)`);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigrations();
