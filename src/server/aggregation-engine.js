/**
 * Aggregation Engine — SQL-based metric grouping.
 *
 * Supports grouping by: day, week, dekada, month, quarter, year, client.
 * Handles aggregation methods per metric type:
 *   - absolute  → SUM
 *   - averaged  → weighted average (SUM(fact*sample) / SUM(sample))
 *   - percentage → weighted average
 *   - computed  → post-calculation via formula engine
 */

import { isDbConnected, query } from './db.js';

/**
 * @typedef {Object} AggregationQuery
 * @property {string[]} metricIds
 * @property {string}   dateFrom    — YYYY-MM-DD
 * @property {string}   dateTo      — YYYY-MM-DD
 * @property {'day'|'week'|'dekada'|'month'|'quarter'|'year'|'client'} groupBy
 * @property {{ branchIds?: string[], employeeIds?: string[], clientIds?: string[] }} [filters]
 */

/**
 * Build period key expression for SQL GROUP BY.
 * Returns a SQL expression that maps a date column into the appropriate bucket.
 */
function periodKeyExpr(groupBy) {
  switch (groupBy) {
    case 'day':
      return `s.period_key`;
    case 'week':
      return `TO_CHAR(s.period_key::date, 'IYYY') || '-W' || LPAD(EXTRACT(isodow FROM s.period_key::date)::text, 2, '0')`;
    case 'dekada':
      return `TO_CHAR(s.period_key::date, 'YYYY-MM') || '-D' || CASE
        WHEN EXTRACT(day FROM s.period_key::date) <= 10 THEN '1'
        WHEN EXTRACT(day FROM s.period_key::date) <= 20 THEN '2'
        ELSE '3' END`;
    case 'month':
      return `TO_CHAR(s.period_key::date, 'YYYY-MM')`;
    case 'quarter':
      return `TO_CHAR(s.period_key::date, 'YYYY') || '-Q' || EXTRACT(quarter FROM s.period_key::date)::int`;
    case 'year':
      return `TO_CHAR(s.period_key::date, 'YYYY')`;
    case 'client':
      return `COALESCE(s.client_id, '__no_client__')`;
    default:
      return `TO_CHAR(s.period_key::date, 'YYYY-MM')`;
  }
}

/**
 * Run aggregation query against metric_snapshots.
 *
 * @param {AggregationQuery} q
 * @returns {Promise<{ metricId: string, groupBy: string, series: Array<{ period: string, fact: number, plan: number|null, sampleCount: number }> }[]>}
 */
export async function aggregate(q) {
  if (!isDbConnected()) {
    return { error: 'Database not connected', data: [] };
  }

  const { metricIds, dateFrom, dateTo, groupBy = 'month', filters = {} } = q;

  if (!metricIds?.length) {
    return { error: 'metricIds required', data: [] };
  }

  const results = [];

  for (const metricId of metricIds) {
    // Look up metric definition for aggregation method
    const defRes = await query(
      'SELECT metric_type, aggregation_method FROM metric_definitions WHERE id = $1',
      [metricId]
    );
    const metricDef = defRes?.rows?.[0];
    const aggMethod = metricDef?.aggregation_method || 'sum';
    const metricType = metricDef?.metric_type || 'absolute';

    // Build WHERE conditions
    const conditions = ['s.metric_id = $1', 's.period_type = $2', 's.period_key >= $3', 's.period_key <= $4'];
    const params = [metricId, 'day', dateFrom, dateTo];
    let paramIdx = 5;

    if (filters.branchIds?.length) {
      conditions.push(`s.branch_id = ANY($${paramIdx})`);
      params.push(filters.branchIds);
      paramIdx++;
    }
    if (filters.employeeIds?.length) {
      conditions.push(`s.employee_id = ANY($${paramIdx})`);
      params.push(filters.employeeIds);
      paramIdx++;
    }
    if (filters.clientIds?.length) {
      conditions.push(`s.client_id = ANY($${paramIdx})`);
      params.push(filters.clientIds);
      paramIdx++;
    }

    const pkExpr = periodKeyExpr(groupBy);

    // Choose aggregation SQL based on metric type / method
    let factAgg, planAgg;
    if (metricType === 'averaged' || metricType === 'percentage' || aggMethod === 'weighted_average') {
      // Weighted average: SUM(fact * sample_count) / NULLIF(SUM(sample_count), 0)
      factAgg = `ROUND(CAST(SUM(s.fact_value * COALESCE(s.sample_count, 1)) / NULLIF(SUM(COALESCE(s.sample_count, 1)), 0) AS NUMERIC), 2)`;
      planAgg = `ROUND(CAST(AVG(s.plan_value) AS NUMERIC), 2)`;
    } else if (aggMethod === 'last') {
      // Last value within the period
      factAgg = `(ARRAY_AGG(s.fact_value ORDER BY s.period_key DESC))[1]`;
      planAgg = `(ARRAY_AGG(s.plan_value ORDER BY s.period_key DESC))[1]`;
    } else {
      // Default: SUM
      factAgg = `COALESCE(SUM(s.fact_value), 0)`;
      planAgg = `SUM(s.plan_value)`;
    }

    const sql = `
      SELECT
        ${pkExpr} AS period,
        ${factAgg} AS fact,
        ${planAgg} AS plan,
        SUM(COALESCE(s.sample_count, 0)) AS sample_count
      FROM metric_snapshots s
      WHERE ${conditions.join(' AND ')}
      GROUP BY ${groupBy === 'client' ? 's.client_id' : pkExpr}
      ORDER BY period
    `;

    const res = await query(sql, params);
    const series = (res?.rows || []).map(r => ({
      period: r.period,
      fact: parseFloat(r.fact) || 0,
      plan: r.plan != null ? parseFloat(r.plan) : null,
      sampleCount: parseInt(r.sample_count) || 0,
    }));

    // For client grouping, enrich with client names
    if (groupBy === 'client' && series.length > 0) {
      const clientIds = series.map(s => s.period).filter(p => p !== '__no_client__');
      if (clientIds.length > 0) {
        const clientRes = await query(
          'SELECT id, name FROM dim_clients WHERE id = ANY($1)',
          [clientIds]
        );
        const clientMap = new Map((clientRes?.rows || []).map(r => [r.id, r.name]));
        for (const s of series) {
          s.clientName = clientMap.get(s.period) || null;
        }
      }
    }

    results.push({
      metricId,
      metricType,
      groupBy,
      series,
    });
  }

  return { data: results };
}

/**
 * Write a snapshot for a given day (upsert).
 * Called by event processing pipeline and manual data entry.
 */
export async function upsertSnapshot({ metricId, branchId, employeeId, clientId, periodType, periodKey, factValue, planValue, sampleCount, source }) {
  if (!isDbConnected()) return null;

  const sql = `
    INSERT INTO metric_snapshots (metric_id, branch_id, employee_id, client_id, period_type, period_key, fact_value, plan_value, sample_count, source, computed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    ON CONFLICT (metric_id, branch_id, employee_id, client_id, period_type, period_key)
    DO UPDATE SET
      fact_value = EXCLUDED.fact_value,
      plan_value = COALESCE(EXCLUDED.plan_value, metric_snapshots.plan_value),
      sample_count = EXCLUDED.sample_count,
      source = EXCLUDED.source,
      computed_at = now()
    RETURNING *
  `;

  const res = await query(sql, [
    metricId,
    branchId || null,
    employeeId || null,
    clientId || null,
    periodType || 'day',
    periodKey,
    factValue ?? 0,
    planValue ?? null,
    sampleCount ?? 1,
    source || 'aggregated',
  ]);

  return res?.rows?.[0] || null;
}

/**
 * Aggregate events into daily snapshots for a metric.
 * Used by the event ingestion pipeline after new events arrive.
 */
export async function aggregateEventsToSnapshots(metricId, metricKey, dateFrom, dateTo) {
  if (!isDbConnected()) return 0;

  const sql = `
    INSERT INTO metric_snapshots (metric_id, branch_id, employee_id, client_id, period_type, period_key, fact_value, sample_count, source, computed_at)
    SELECT
      $1,
      e.branch_id,
      e.employee_id,
      e.client_id,
      'day',
      e.event_time::date::text,
      COALESCE(SUM((e.metric_values->>$2)::numeric), 0),
      COUNT(*),
      'event_aggregated',
      now()
    FROM events e
    WHERE e.event_time::date BETWEEN $3::date AND $4::date
      AND e.metric_values ? $2
    GROUP BY e.branch_id, e.employee_id, e.client_id, e.event_time::date
    ON CONFLICT (metric_id, branch_id, employee_id, client_id, period_type, period_key)
    DO UPDATE SET
      fact_value = EXCLUDED.fact_value,
      sample_count = EXCLUDED.sample_count,
      source = 'event_aggregated',
      computed_at = now()
  `;

  const res = await query(sql, [metricId, metricKey, dateFrom, dateTo]);
  return res?.rowCount || 0;
}
