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
      try {
        await pool.query(sql);
        console.log('Done:', file);
      } catch (err) {
        if (
          err.code === '42P07' ||
          (err.message && err.message.includes('already exists'))
        ) {
          console.log('Done (some objects already existed):', file);
        } else {
          throw err;
        }
      }
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
