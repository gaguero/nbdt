'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running database migrations...');

    const schemaFiles = ['schema.sql', 'schema-v2.sql', 'schema-v3.sql', 'schema-v4.sql', 'schema-v5.sql', 'schema-v6.sql', 'schema-v7.sql', 'schema-v8.sql', 'schema-v9.sql', 'schema-v10.sql'];

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
      // Must handle dollar-quoted $$ blocks (used in functions/triggers).
      const statements = [];
      let current = '';
      let inDollarQuote = false;
      const lines = sql.split('\n');
      for (const line of lines) {
        const dollarCount = (line.match(/\$\$/g) || []).length;
        if (dollarCount % 2 !== 0) inDollarQuote = !inDollarQuote;
        current += line + '\n';
        if (!inDollarQuote && line.trimEnd().endsWith(';')) {
          const stmt = current.trim();
          if (stmt.length > 0) statements.push(stmt);
          current = '';
        }
      }
      if (current.trim().length > 0) statements.push(current.trim());

      let applied = 0;
      let skipped = 0;
      for (const rawStmt of statements) {
        // Strip leading comment lines so a statement preceded by -- comments is not skipped
        const stmt = rawStmt
          .split('\n')
          .filter(line => !line.trimStart().startsWith('--'))
          .join('\n')
          .trim();
        if (!stmt) continue;
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
            console.error('Error details:', err.code, err.message);
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
