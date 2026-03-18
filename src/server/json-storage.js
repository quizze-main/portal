/**
 * Shared JSON file storage helpers.
 *
 * Provides read/write/lock utilities used by org-data.js, rbac.js,
 * and user-settings.js for dual-persistence (DB + JSON fallback).
 *
 * Follows the same pattern as shift-schedule-api.js.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DATA_DIR = path.resolve(__dirname, '../../data');

// ─── Per-file mutex to prevent concurrent write races ────────────────────────

const writeLocks = new Map();

/**
 * Execute `fn` while holding a per-file lock.
 * Prevents concurrent JSON file writes from clobbering each other.
 */
export async function withFileLock(filePath, fn) {
  const prev = writeLocks.get(filePath) || Promise.resolve();
  let resolve;
  const next = new Promise(r => { resolve = r; });
  writeLocks.set(filePath, next);
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
  }
}

// ─── JSON file read helpers ──────────────────────────────────────────────────

/**
 * Read a JSON file and return a specific array by key.
 * Returns empty array if file missing, malformed, or key absent.
 */
export async function readJsonFile(filePath, arrayKey) {
  try {
    if (!existsSync(filePath)) return [];
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data[arrayKey]) ? data[arrayKey] : [];
  } catch {
    return [];
  }
}

/**
 * Read a JSON file and return the full parsed object.
 * Returns empty object if file missing or malformed.
 */
export async function readJsonRaw(filePath) {
  try {
    if (!existsSync(filePath)) return {};
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── JSON file write helper ─────────────────────────────────────────────────

/**
 * Write data to a JSON file (pretty-printed).
 * Creates the data/ directory if it doesn't exist.
 */
export async function writeJsonFile(filePath, data) {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
