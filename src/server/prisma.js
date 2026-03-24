/**
 * Prisma Client singleton module.
 * Drop-in replacement for db.js with identical lifecycle API.
 * Provides both Prisma Client API and raw SQL compatibility via rawQuery().
 */
import { PrismaClient } from '../../generated/prisma/client.js';

let prisma = null;
let connected = false;

/**
 * Initialize Prisma Client and connect to PostgreSQL.
 * @returns {Promise<boolean>} true if connected
 */
export async function initPrisma() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.log('DATABASE_URL not configured, using JSON file storage');
    return false;
  }

  try {
    prisma = new PrismaClient({
      datasourceUrl: DATABASE_URL,
      log: process.env.NODE_ENV === 'local' ? ['warn', 'error'] : ['error'],
    });

    await prisma.$connect();
    connected = true;
    console.log('Prisma connected to PostgreSQL');
    return true;
  } catch (error) {
    console.error('Prisma init failed:', error.message);
    prisma = null;
    connected = false;
    return false;
  }
}

/**
 * Check if Prisma is connected to PostgreSQL.
 */
export function isPrismaConnected() {
  return connected && prisma !== null;
}

/**
 * Get the Prisma Client instance. Returns null if not connected.
 */
export function getPrisma() {
  return prisma;
}

/**
 * Execute a raw SQL query with parameterized placeholders ($1, $2, ...).
 * Returns { rows, rowCount } for compatibility with pg.Pool.query().
 * Returns null if DB is not connected.
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {any[]} params - Query parameters
 */
export async function rawQuery(text, params = []) {
  if (!isPrismaConnected()) return null;
  const rows = await prisma.$queryRawUnsafe(text, ...params);
  return { rows, rowCount: rows.length };
}

/**
 * Execute a function within a database transaction.
 * Compatible with db.js withTransaction(fn) — fn receives a client-like object.
 * @param {(client: { query: (sql: string, params?: any[]) => Promise<any> }) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
export async function withPrismaTransaction(fn) {
  if (!isPrismaConnected()) {
    throw new Error('Database not connected');
  }
  return prisma.$transaction(async (tx) => {
    const clientAdapter = {
      query: (sql, params = []) => tx.$queryRawUnsafe(sql, ...params),
    };
    return fn(clientAdapter);
  });
}

/**
 * Close the Prisma Client connection gracefully.
 */
export async function closePrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    connected = false;
    console.log('Prisma disconnected');
  }
}
