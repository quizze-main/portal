/**
 * Polling Scheduler — background polling of data sources.
 *
 * Periodically polls enabled data sources that have a poll interval configured.
 * Events are ingested through the standard event ingestion pipeline.
 */

import { isDbConnected, query } from '../db.js';
import { getAdapter } from './adapter-loader.js';
import { ingestEvents } from '../event-ingestion.js';

/** @type {NodeJS.Timeout | null} */
let schedulerInterval = null;

/** Minimum poll interval (60 seconds) */
const MIN_POLL_INTERVAL_S = 60;

/** Scheduler check frequency (every 30 seconds) */
const SCHEDULER_CHECK_MS = 30_000;

/** Track active polls to prevent overlap */
const activePolls = new Set();

/**
 * Start the polling scheduler.
 * Checks every 30 seconds which data sources need polling.
 */
export function startPollingScheduler() {
  if (schedulerInterval) {
    console.warn('[polling-scheduler] Already running');
    return;
  }

  console.log('[polling-scheduler] Starting scheduler');

  schedulerInterval = setInterval(async () => {
    try {
      await checkAndPoll();
    } catch (err) {
      console.error('[polling-scheduler] Check cycle error:', err.message);
    }
  }, SCHEDULER_CHECK_MS);

  // Run immediately on start
  checkAndPoll().catch(err =>
    console.error('[polling-scheduler] Initial check error:', err.message)
  );
}

/**
 * Stop the polling scheduler.
 */
export function stopPollingScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[polling-scheduler] Stopped');
  }
}

/**
 * Check which data sources need polling and trigger polls.
 */
async function checkAndPoll() {
  if (!isDbConnected()) return;

  // Find sources with polling enabled and overdue for a poll
  const res = await query(`
    SELECT id, label, base_url AS "baseUrl", auth_type AS "authType", auth_config AS "authConfig",
           adapter_type AS "adapterType", adapter_config AS "adapterConfig",
           poll_interval_s AS "pollIntervalS", last_poll_at AS "lastPollAt",
           webhook_secret AS "webhookSecret", enabled, timeout,
           field_mappings AS "fieldMappings"
    FROM data_sources
    WHERE enabled = true
      AND poll_interval_s IS NOT NULL
      AND poll_interval_s >= $1
      AND (last_poll_at IS NULL OR last_poll_at + (poll_interval_s || ' seconds')::interval < now())
  `, [MIN_POLL_INTERVAL_S]);

  if (!res?.rows?.length) return;

  for (const source of res.rows) {
    // Skip if already polling this source
    if (activePolls.has(source.id)) continue;

    // Fire and forget — don't block the scheduler
    pollSource(source).catch(err =>
      console.error(`[polling-scheduler] Poll failed for ${source.id}:`, err.message)
    );
  }
}

/**
 * Poll a single data source.
 * @param {object} source — data source config row
 */
async function pollSource(source) {
  activePolls.add(source.id);

  try {
    const adapter = await getAdapter(source);
    const lastPollAt = source.lastPollAt ? new Date(source.lastPollAt) : null;

    console.log(`[polling-scheduler] Polling ${source.id} (last: ${lastPollAt?.toISOString() || 'never'})`);

    const events = await adapter.poll(source, lastPollAt);

    if (events.length > 0) {
      const result = await ingestEvents(source.id, events);
      console.log(`[polling-scheduler] ${source.id}: ${result.inserted} new, ${result.duplicates} dup, ${result.errors.length} errors`);
    }

    // Update last_poll_at
    await query(
      'UPDATE data_sources SET last_poll_at = now() WHERE id = $1',
      [source.id]
    );
  } finally {
    activePolls.delete(source.id);
  }
}

/**
 * Manually trigger a poll for a specific data source.
 * @param {string} sourceId
 * @returns {Promise<{ events: number, inserted: number, duplicates: number, errors: string[] }>}
 */
export async function manualPoll(sourceId) {
  if (!isDbConnected()) {
    return { events: 0, inserted: 0, duplicates: 0, errors: ['Database not connected'] };
  }

  const res = await query(`
    SELECT id, label, base_url AS "baseUrl", auth_type AS "authType", auth_config AS "authConfig",
           adapter_type AS "adapterType", adapter_config AS "adapterConfig",
           poll_interval_s AS "pollIntervalS", last_poll_at AS "lastPollAt",
           webhook_secret AS "webhookSecret", enabled, timeout,
           field_mappings AS "fieldMappings"
    FROM data_sources WHERE id = $1
  `, [sourceId]);

  const source = res?.rows?.[0];
  if (!source) {
    return { events: 0, inserted: 0, duplicates: 0, errors: ['Source not found'] };
  }

  const adapter = await getAdapter(source);
  const lastPollAt = source.lastPollAt ? new Date(source.lastPollAt) : null;
  const events = await adapter.poll(source, lastPollAt);

  let result = { inserted: 0, duplicates: 0, errors: [] };
  if (events.length > 0) {
    result = await ingestEvents(sourceId, events);
  }

  await query('UPDATE data_sources SET last_poll_at = now() WHERE id = $1', [sourceId]);

  return {
    events: events.length,
    ...result,
  };
}
