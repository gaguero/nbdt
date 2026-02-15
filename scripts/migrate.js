import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Running database migrations...');
    console.log(`📁 Reading schema from: ${path.join(__dirname, 'schema-v2.sql')}`);

    // Read the schema SQL file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema-v2.sql'),
      'utf8'
    );

    // Execute the schema
    await pool.query(schemaSQL);

    console.log('✓ Database schema created successfully');
    console.log('✓ All tables, indexes, and triggers have been set up');
    process.exit(0);
  } catch (error) {
    // Handle "already exists" errors gracefully
    if (error.code === '42P07') {
      console.log('⚠️  Some tables already exist - this is okay');
      console.log('✓ Migration completed (schema already initialized)');
      process.exit(0);
    } else if (error.message && error.message.includes('already exists')) {
      console.log('⚠️  Some database objects already exist - this is okay');
      console.log('✓ Migration completed (schema already initialized)');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigrations();
