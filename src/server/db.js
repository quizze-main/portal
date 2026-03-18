/**
 * PostgreSQL connection pool module.
 * Follows the same pattern as cache.js — graceful init with fallback.
 * When DATABASE_URL is not configured, all queries are skipped
 * and the app falls back to JSON file storage.
 */
import pg from 'pg';

let pool = null;
let connected = false;

/**
 * Initialize PostgreSQL connection pool.
 * Called once at server startup (fire-and-forget, like initRedisCache).
 * @returns {Promise<boolean>} true if connected
 */
export async function initDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not configured, using JSON file storage');
    return false;
  }

  try {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('❌ PostgreSQL pool error:', err.message);
      connected = false;
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    connected = true;
    console.log('✅ PostgreSQL connected');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL init failed:', error.message);
    pool = null;
    connected = false;
    return false;
  }
}

/**
 * Check if PostgreSQL is connected.
 */
export function isDbConnected() {
  return connected && pool !== null;
}

/**
 * Get the connection pool. Returns null if not connected.
 */
export function getPool() {
  return pool;
}

/**
 * Execute a parameterized query. Returns null if DB is not connected.
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {any[]} params - Query parameters
 * @returns {Promise<import('pg').QueryResult|null>}
 */
export async function query(text, params = []) {
  if (!isDbConnected()) return null;
  return pool.query(text, params);
}

/**
 * Execute a function within a database transaction.
 * Acquires a client, runs BEGIN, executes fn(client), then COMMIT or ROLLBACK.
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withTransaction(fn) {
  if (!isDbConnected()) {
    throw new Error('Database not connected');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool gracefully.
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    connected = false;
    console.log('⚪ PostgreSQL disconnected');
  }
}
