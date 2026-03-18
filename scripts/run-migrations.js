/**
 * Run SQL migrations in order.
 * Tracks applied migrations in a `_migrations` table.
 * Safe to re-run — skips already applied migrations.
 *
 * Usage: node scripts/run-migrations.js
 * Requires DATABASE_URL env var.
 */
import 'dotenv/config';
import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function run() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping migrations');
    process.exit(0);
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Get already applied migrations
    const { rows: applied } = await pool.query('SELECT name FROM _migrations ORDER BY name');
    const appliedSet = new Set(applied.map(r => r.name));

    // Read migration files
    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      process.exit(0);
    }

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏭  ${file} (already applied)`);
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ ${file}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ ${file}: ${err.message}`);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`\nMigrations complete: ${count} applied, ${files.length - count} skipped`);
  } finally {
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
