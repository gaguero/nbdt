import { Pool, QueryResult, QueryResultRow } from 'pg';

// Create a connection pool to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum 10 connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Event handlers for connection monitoring
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Generic query execution helper
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Only log if not in production or if query is slow
    if (process.env.NODE_ENV !== 'production' || duration > 1000) {
      const summary = text.trim().substring(0, 100).replace(/\n/g, ' ');
      console.log(`DB Query [${duration}ms, ${result.rowCount} rows]: ${summary}${text.length > 100 ? '...' : ''}`);
    }
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper for single row queries
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// Helper for queries that return multiple rows
export async function queryMany<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Transaction helper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get a client from the pool (for advanced usage)
export async function getClient() {
  return await pool.connect();
}

// Close the pool (useful for graceful shutdown)
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

// Export the pool for direct access if needed
export default pool;
