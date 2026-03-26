/**
 * Analytics Views — materialized view management and time-series queries.
 *
 * Provides fast pre-aggregated data from materialized views,
 * with automatic refresh scheduling and fallback to live queries.
 */

import { isPrismaConnected as isDbConnected, rawQuery as query } from './prisma.js';

/** Materialized views and their refresh intervals (ms) */
const VIEWS = {
  mv_monthly_by_branch:    { refreshInterval: 5 * 60_000, label: 'Monthly by branch' },
  mv_monthly_by_employee:  { refreshInterval: 5 * 60_000, label: 'Monthly by employee' },
  mv_daily_events:         { refreshInterval: 2 * 60_000, label: 'Daily events' },
  mv_quarterly_by_branch:  { refreshInterval: 15 * 60_000, label: 'Quarterly by branch' },
};

/** @type {NodeJS.Timeout | null} */
let refreshTimer = null;

/**
 * Refresh a single materialized view.
 * @param {string} viewName
 * @returns {Promise<{ viewName: string, durationMs: number, success: boolean }>}
 */
export async function refreshView(viewName) {
  if (!isDbConnected()) return { viewName, durationMs: 0, success: false };

  const start = Date.now();
  try {
    await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);
    const durationMs = Date.now() - start;

    // Log refresh
    await query(`
      INSERT INTO _materialized_view_refresh_log (view_name, last_refresh, duration_ms)
      VALUES ($1, now(), $2)
      ON CONFLICT (view_name) DO UPDATE SET last_refresh = now(), duration_ms = $2
    `, [viewName, durationMs]);

    return { viewName, durationMs, success: true };
  } catch (err) {
    // CONCURRENTLY requires unique index — fall back to non-concurrent if it fails
    try {
      await query(`REFRESH MATERIALIZED VIEW ${viewName}`);
      const durationMs = Date.now() - start;
      await query(`
        INSERT INTO _materialized_view_refresh_log (view_name, last_refresh, duration_ms)
        VALUES ($1, now(), $2)
        ON CONFLICT (view_name) DO UPDATE SET last_refresh = now(), duration_ms = $2
      `, [viewName, durationMs]);
      return { viewName, durationMs, success: true };
    } catch (err2) {
      console.error(`[analytics-views] Failed to refresh ${viewName}:`, err2.message);
      return { viewName, durationMs: Date.now() - start, success: false };
    }
  }
}

/**
 * Refresh all materialized views.
 * @returns {Promise<Array<{ viewName: string, durationMs: number, success: boolean }>>}
 */
export async function refreshAllViews() {
  const results = [];
  for (const viewName of Object.keys(VIEWS)) {
    const r = await refreshView(viewName);
    results.push(r);
  }
  return results;
}

/**
 * Start automatic refresh scheduler.
 * Uses the shortest interval among all views.
 */
export function startViewRefreshScheduler() {
  if (refreshTimer) return;
  if (!isDbConnected()) return;

  const minInterval = Math.min(...Object.values(VIEWS).map(v => v.refreshInterval));

  console.log(`[analytics-views] Starting refresh scheduler (interval: ${minInterval / 1000}s)`);

  refreshTimer = setInterval(async () => {
    try {
      await refreshStaleViews();
    } catch (err) {
      console.error('[analytics-views] Refresh cycle error:', err.message);
    }
  }, minInterval);

  // Refresh all on startup
  refreshAllViews().catch(err =>
    console.warn('[analytics-views] Initial refresh failed:', err.message)
  );
}

/**
 * Stop the refresh scheduler.
 */
export function stopViewRefreshScheduler() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Refresh only views that are stale (past their refresh interval).
 */
async function refreshStaleViews() {
  if (!isDbConnected()) return;

  const logRes = await query('SELECT view_name, last_refresh FROM _materialized_view_refresh_log');
  const lastRefreshMap = new Map((logRes?.rows || []).map(r => [r.view_name, new Date(r.last_refresh)]));

  const now = Date.now();
  for (const [viewName, config] of Object.entries(VIEWS)) {
    const lastRefresh = lastRefreshMap.get(viewName);
    if (!lastRefresh || (now - lastRefresh.getTime()) > config.refreshInterval) {
      await refreshView(viewName);
    }
  }
}

/**
 * Get refresh status for all views.
 */
export async function getViewRefreshStatus() {
  if (!isDbConnected()) return [];

  const res = await query('SELECT view_name, last_refresh, duration_ms, row_count FROM _materialized_view_refresh_log ORDER BY view_name');
  return (res?.rows || []).map(r => ({
    viewName: r.view_name,
    label: VIEWS[r.view_name]?.label || r.view_name,
    lastRefresh: r.last_refresh,
    durationMs: r.duration_ms,
    rowCount: r.row_count,
    refreshInterval: VIEWS[r.view_name]?.refreshInterval || null,
  }));
}

// ==================== Time-Series Queries ====================

/**
 * Get monthly time-series for a metric across branches.
 * Uses materialized view when available, falls back to live query.
 *
 * @param {string} metricId
 * @param {Object} opts
 * @param {string[]} [opts.branchIds]
 * @param {string} [opts.dateFrom] — YYYY-MM
 * @param {string} [opts.dateTo] — YYYY-MM
 * @returns {Promise<Array<{ monthKey: string, branchId: string, factValue: number, sampleCount: number }>>}
 */
export async function getMonthlyByBranch(metricId, { branchIds, dateFrom, dateTo } = {}) {
  if (!isDbConnected()) return [];

  const conditions = ['metric_id = $1'];
  const params = [metricId];
  let idx = 2;

  if (branchIds?.length) {
    conditions.push(`branch_id = ANY($${idx})`);
    params.push(branchIds);
    idx++;
  }
  if (dateFrom) {
    conditions.push(`month_key >= $${idx}`);
    params.push(dateFrom);
    idx++;
  }
  if (dateTo) {
    conditions.push(`month_key <= $${idx}`);
    params.push(dateTo);
    idx++;
  }

  const res = await query(
    `SELECT month_key, branch_id, fact_value, sample_count, day_count, metric_type
     FROM mv_monthly_by_branch
     WHERE ${conditions.join(' AND ')}
     ORDER BY month_key, branch_id`,
    params
  );

  return (res?.rows || []).map(r => ({
    monthKey: r.month_key,
    branchId: r.branch_id,
    factValue: parseFloat(r.fact_value) || 0,
    sampleCount: parseInt(r.sample_count) || 0,
    dayCount: parseInt(r.day_count) || 0,
    metricType: r.metric_type,
  }));
}

/**
 * Get monthly time-series for a metric by employee.
 */
export async function getMonthlyByEmployee(metricId, { employeeIds, branchIds, dateFrom, dateTo } = {}) {
  if (!isDbConnected()) return [];

  const conditions = ['metric_id = $1'];
  const params = [metricId];
  let idx = 2;

  if (employeeIds?.length) {
    conditions.push(`employee_id = ANY($${idx})`);
    params.push(employeeIds);
    idx++;
  }
  if (branchIds?.length) {
    conditions.push(`branch_id = ANY($${idx})`);
    params.push(branchIds);
    idx++;
  }
  if (dateFrom) {
    conditions.push(`month_key >= $${idx}`);
    params.push(dateFrom);
    idx++;
  }
  if (dateTo) {
    conditions.push(`month_key <= $${idx}`);
    params.push(dateTo);
    idx++;
  }

  const res = await query(
    `SELECT month_key, employee_id, branch_id, fact_value, sample_count, day_count, metric_type
     FROM mv_monthly_by_employee
     WHERE ${conditions.join(' AND ')}
     ORDER BY month_key, employee_id`,
    params
  );

  return (res?.rows || []).map(r => ({
    monthKey: r.month_key,
    employeeId: r.employee_id,
    branchId: r.branch_id,
    factValue: parseFloat(r.fact_value) || 0,
    sampleCount: parseInt(r.sample_count) || 0,
    dayCount: parseInt(r.day_count) || 0,
    metricType: r.metric_type,
  }));
}

/**
 * Get daily event summary.
 */
export async function getDailyEvents({ eventType, branchIds, dateFrom, dateTo } = {}) {
  if (!isDbConnected()) return [];

  const conditions = [];
  const params = [];
  let idx = 1;

  if (eventType) {
    conditions.push(`event_type = $${idx}`);
    params.push(eventType);
    idx++;
  }
  if (branchIds?.length) {
    conditions.push(`branch_id = ANY($${idx})`);
    params.push(branchIds);
    idx++;
  }
  if (dateFrom) {
    conditions.push(`event_date >= $${idx}::date`);
    params.push(dateFrom);
    idx++;
  }
  if (dateTo) {
    conditions.push(`event_date <= $${idx}::date`);
    params.push(dateTo);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query(
    `SELECT event_type, branch_id, event_date, event_count, total_revenue, total_items
     FROM mv_daily_events ${where}
     ORDER BY event_date DESC
     LIMIT 1000`,
    params
  );

  return (res?.rows || []).map(r => ({
    eventType: r.event_type,
    branchId: r.branch_id,
    eventDate: r.event_date,
    eventCount: parseInt(r.event_count) || 0,
    totalRevenue: parseFloat(r.total_revenue) || 0,
    totalItems: parseInt(r.total_items) || 0,
  }));
}
