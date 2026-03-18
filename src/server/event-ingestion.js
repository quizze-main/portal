/**
 * Event Ingestion — webhook handler, event deduplication, and polling scheduler.
 *
 * Accepts events from CRM webhooks and manual input.
 * Deduplicates by (source_id, external_id).
 * After ingestion, triggers aggregation into metric_snapshots.
 */

import { isDbConnected, query } from './db.js';
import { aggregateEventsToSnapshots } from './aggregation-engine.js';

/**
 * @typedef {Object} IncomingEvent
 * @property {string}  eventType     — e.g. 'order_created', 'order_closed'
 * @property {string}  eventTime     — ISO 8601
 * @property {string}  [externalId]  — for deduplication
 * @property {string}  [branchId]
 * @property {string}  [employeeId]
 * @property {string}  [clientId]
 * @property {Record<string, number>} metricValues — e.g. { revenue: 15000, items_count: 2 }
 * @property {*}       [rawPayload]  — full original payload for replay
 */

/**
 * Ingest a batch of events.
 * Deduplicates by (sourceId, externalId). Returns count of new events inserted.
 *
 * @param {string} sourceId — data source identifier
 * @param {IncomingEvent[]} events
 * @returns {Promise<{ inserted: number, duplicates: number, errors: string[] }>}
 */
export async function ingestEvents(sourceId, events) {
  if (!isDbConnected()) {
    return { inserted: 0, duplicates: 0, errors: ['Database not connected'] };
  }

  if (!events?.length) {
    return { inserted: 0, duplicates: 0, errors: [] };
  }

  let inserted = 0;
  let duplicates = 0;
  const errors = [];

  for (const event of events) {
    try {
      // Validate required fields
      if (!event.eventType) {
        errors.push(`Missing eventType in event`);
        continue;
      }
      if (!event.eventTime) {
        errors.push(`Missing eventTime in event ${event.externalId || '(no id)'}`);
        continue;
      }

      const sql = `
        INSERT INTO events (event_type, event_time, branch_id, employee_id, client_id, source_id, external_id, metric_values, raw_payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (source_id, external_id) WHERE external_id IS NOT NULL
        DO NOTHING
        RETURNING id
      `;

      const res = await query(sql, [
        event.eventType,
        event.eventTime,
        event.branchId || null,
        event.employeeId || null,
        event.clientId || null,
        sourceId,
        event.externalId || null,
        JSON.stringify(event.metricValues || {}),
        event.rawPayload ? JSON.stringify(event.rawPayload) : null,
      ]);

      if (res?.rows?.length > 0) {
        inserted++;
      } else {
        duplicates++;
      }
    } catch (err) {
      errors.push(`Event ${event.externalId || '(no id)'}: ${err.message}`);
    }
  }

  return { inserted, duplicates, errors };
}

/**
 * Query events with filters and pagination.
 *
 * @param {Object} filters
 * @param {string} [filters.sourceId]
 * @param {string} [filters.eventType]
 * @param {string} [filters.branchId]
 * @param {string} [filters.employeeId]
 * @param {string} [filters.clientId]
 * @param {string} [filters.dateFrom] — YYYY-MM-DD
 * @param {string} [filters.dateTo]   — YYYY-MM-DD
 * @param {number} [filters.limit=50]
 * @param {number} [filters.offset=0]
 * @returns {Promise<{ data: Object[], total: number }>}
 */
export async function queryEvents(filters = {}) {
  if (!isDbConnected()) {
    return { data: [], total: 0 };
  }

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.sourceId) {
    conditions.push(`source_id = $${paramIdx++}`);
    params.push(filters.sourceId);
  }
  if (filters.eventType) {
    conditions.push(`event_type = $${paramIdx++}`);
    params.push(filters.eventType);
  }
  if (filters.branchId) {
    conditions.push(`branch_id = $${paramIdx++}`);
    params.push(filters.branchId);
  }
  if (filters.employeeId) {
    conditions.push(`employee_id = $${paramIdx++}`);
    params.push(filters.employeeId);
  }
  if (filters.clientId) {
    conditions.push(`client_id = $${paramIdx++}`);
    params.push(filters.clientId);
  }
  if (filters.dateFrom) {
    conditions.push(`event_time >= $${paramIdx++}::date`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`event_time < ($${paramIdx++}::date + interval '1 day')`);
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit || 50, 500);
  const offset = filters.offset || 0;

  const countRes = await query(`SELECT COUNT(*) FROM events ${where}`, params);
  const total = parseInt(countRes?.rows?.[0]?.count) || 0;

  const dataRes = await query(
    `SELECT id, event_type, event_time, branch_id, employee_id, client_id, source_id, external_id, metric_values, received_at, processed
     FROM events ${where}
     ORDER BY event_time DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return {
    data: dataRes?.rows || [],
    total,
  };
}

/**
 * Trigger re-aggregation of events into snapshots for a date range.
 * Called after event ingestion or manually.
 *
 * @param {string} metricId
 * @param {string} metricKey — the key within metric_values JSON
 * @param {string} dateFrom
 * @param {string} dateTo
 * @returns {Promise<number>} — number of snapshot rows upserted
 */
export async function reaggregate(metricId, metricKey, dateFrom, dateTo) {
  return aggregateEventsToSnapshots(metricId, metricKey, dateFrom, dateTo);
}

/**
 * Mark events as processed.
 * @param {number[]} eventIds
 */
export async function markProcessed(eventIds) {
  if (!isDbConnected() || !eventIds?.length) return;
  await query(
    `UPDATE events SET processed = true, processed_at = now() WHERE id = ANY($1)`,
    [eventIds]
  );
}

/**
 * Set up event ingestion API routes.
 *
 * @param {import('express').Express} app
 * @param {Function} requireAuth
 */
export function setupEventRoutes(app, requireAuth) {
  // Webhook endpoint — accepts events from CRM systems
  // Auth: checks webhook_secret from data_sources table
  app.post('/api/events/webhook/:sourceId', async (req, res) => {
    try {
      const { sourceId } = req.params;

      // Verify source exists
      if (isDbConnected()) {
        const srcRes = await query(
          'SELECT id, webhook_secret, enabled FROM data_sources WHERE id = $1',
          [sourceId]
        );
        const src = srcRes?.rows?.[0];
        if (!src) return res.status(404).json({ error: 'Unknown source' });
        if (!src.enabled) return res.status(403).json({ error: 'Source disabled' });

        // Verify webhook secret if configured
        if (src.webhook_secret) {
          const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
          if (providedSecret !== src.webhook_secret) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
          }
        }
      }

      // Normalize payload — accept single event or array
      const payload = req.body;
      const events = Array.isArray(payload) ? payload : [payload];

      // Transform camelCase → our format
      const normalized = events.map(e => ({
        eventType: e.eventType || e.event_type,
        eventTime: e.eventTime || e.event_time || new Date().toISOString(),
        externalId: e.externalId || e.external_id,
        branchId: e.branchId || e.branch_id,
        employeeId: e.employeeId || e.employee_id,
        clientId: e.clientId || e.client_id,
        metricValues: e.metricValues || e.metric_values || {},
        rawPayload: e,
      }));

      const result = await ingestEvents(sourceId, normalized);

      // Update last_poll_at on the data source
      if (isDbConnected()) {
        await query(
          'UPDATE data_sources SET last_poll_at = now() WHERE id = $1',
          [sourceId]
        );
      }

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      console.error('[event-ingestion] Webhook error:', err);
      res.status(500).json({ error: 'Event ingestion failed' });
    }
  });

  // Manual event submission (admin)
  app.post('/api/admin/events', requireAuth, async (req, res) => {
    try {
      const { sourceId = 'manual', events: rawEvents } = req.body;

      if (!rawEvents?.length) {
        return res.status(400).json({ error: 'events array required' });
      }

      const result = await ingestEvents(sourceId, rawEvents);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[event-ingestion] Manual submission error:', err);
      res.status(500).json({ error: 'Event submission failed' });
    }
  });

  // List events with filters
  app.get('/api/admin/events', requireAuth, async (req, res) => {
    try {
      const filters = {
        sourceId: req.query.source_id,
        eventType: req.query.event_type,
        branchId: req.query.branch_id,
        employeeId: req.query.employee_id,
        clientId: req.query.client_id,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
      };

      const result = await queryEvents(filters);
      res.json(result);
    } catch (err) {
      console.error('[event-ingestion] Query error:', err);
      res.status(500).json({ error: 'Failed to query events' });
    }
  });

  // Re-aggregate events → snapshots
  app.post('/api/admin/events/reaggregate', requireAuth, async (req, res) => {
    try {
      const { metricId, metricKey, dateFrom, dateTo } = req.body;
      if (!metricId || !metricKey || !dateFrom || !dateTo) {
        return res.status(400).json({ error: 'metricId, metricKey, dateFrom, dateTo required' });
      }
      const count = await reaggregate(metricId, metricKey, dateFrom, dateTo);
      res.json({ success: true, snapshotsUpserted: count });
    } catch (err) {
      console.error('[event-ingestion] Reaggregate error:', err);
      res.status(500).json({ error: 'Reaggregation failed' });
    }
  });

  // List event types
  app.get('/api/admin/event-types', requireAuth, async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.json({ data: [] });
      }
      const result = await query('SELECT * FROM event_types ORDER BY id');
      res.json({ data: result?.rows || [] });
    } catch (err) {
      console.error('[event-ingestion] Event types query error:', err);
      res.status(500).json({ error: 'Failed to query event types' });
    }
  });
}
