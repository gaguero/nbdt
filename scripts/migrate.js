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

    // schema.sql first (base tables), then schema-v2.sql (additions)
    const schemaFiles = ['schema.sql', 'schema-v2.sql'];

    for (const file of schemaFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log('Skipping (not found):', file);
        continue;
      }
      console.log('Applying:', file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log('Done:', file);
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    if (
      error.code === '42P07' ||
      (error.message && error.message.includes('already exists'))
    ) {
      console.log('Some objects already exist — migration already applied.');
      process.exit(0);
    }
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
