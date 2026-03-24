/**
 * Export Engine — CSV and Excel export for metrics, events, and reports.
 *
 * Generates server-side exports with proper encoding for Russian content.
 * Streams large datasets to avoid memory issues.
 */

import { isPrismaConnected as isDbConnected, rawQuery as query } from './prisma.js';
import { aggregate } from './aggregation-engine.js';

/** UTF-8 BOM for Excel compatibility with Cyrillic */
const BOM = '\uFEFF';

/**
 * Export metric snapshots as CSV.
 *
 * @param {Object} opts
 * @param {string[]} opts.metricIds
 * @param {string}   opts.dateFrom — YYYY-MM-DD
 * @param {string}   opts.dateTo
 * @param {string}   [opts.groupBy='day']
 * @param {string[]} [opts.branchIds]
 * @param {string[]} [opts.employeeIds]
 * @param {string[]} [opts.clientIds]
 * @returns {Promise<string>} — CSV content
 */
export async function exportMetricsCsv(opts) {
  const { metricIds, dateFrom, dateTo, groupBy = 'day', branchIds, employeeIds, clientIds } = opts;

  const result = await aggregate({
    metricIds,
    dateFrom,
    dateTo,
    groupBy,
    filters: { branchIds, employeeIds, clientIds },
  });

  if (result.error) {
    return `${BOM}Error: ${result.error}`;
  }

  // Get metric names
  const metricNames = {};
  if (isDbConnected() && metricIds.length) {
    const namesRes = await query(
      'SELECT id, name, unit FROM metric_definitions WHERE id = ANY($1)',
      [metricIds]
    );
    for (const r of (namesRes?.rows || [])) {
      metricNames[r.id] = { name: r.name, unit: r.unit };
    }
  }

  const header = ['Метрика', 'Тип', 'Период', 'Факт', 'План', 'Кол-во замеров'];
  if (groupBy === 'client') header.push('Клиент');

  const rows = [];
  for (const metric of (result.data || [])) {
    const mInfo = metricNames[metric.metricId] || {};
    const mName = mInfo.name || metric.metricId;

    for (const point of (metric.series || [])) {
      const row = [
        escapeCsv(mName),
        metric.metricType || '',
        point.period,
        formatNumber(point.fact),
        point.plan != null ? formatNumber(point.plan) : '',
        point.sampleCount || '',
      ];
      if (groupBy === 'client') {
        row.push(escapeCsv(point.clientName || point.period));
      }
      rows.push(row.join(';'));
    }
  }

  return BOM + [header.join(';'), ...rows].join('\r\n');
}

/**
 * Export events as CSV.
 *
 * @param {Object} opts
 * @param {string} [opts.sourceId]
 * @param {string} [opts.eventType]
 * @param {string} [opts.branchId]
 * @param {string} [opts.dateFrom]
 * @param {string} [opts.dateTo]
 * @param {number} [opts.limit=5000]
 * @returns {Promise<string>}
 */
export async function exportEventsCsv(opts = {}) {
  if (!isDbConnected()) return `${BOM}Error: Database not connected`;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (opts.sourceId) {
    conditions.push(`source_id = $${idx++}`);
    params.push(opts.sourceId);
  }
  if (opts.eventType) {
    conditions.push(`event_type = $${idx++}`);
    params.push(opts.eventType);
  }
  if (opts.branchId) {
    conditions.push(`branch_id = $${idx++}`);
    params.push(opts.branchId);
  }
  if (opts.dateFrom) {
    conditions.push(`event_time >= $${idx++}::date`);
    params.push(opts.dateFrom);
  }
  if (opts.dateTo) {
    conditions.push(`event_time < ($${idx++}::date + interval '1 day')`);
    params.push(opts.dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(opts.limit || 5000, 50000);

  const res = await query(
    `SELECT id, event_type, event_time, branch_id, employee_id, client_id, source_id, external_id, metric_values
     FROM events ${where}
     ORDER BY event_time DESC
     LIMIT $${idx}`,
    [...params, limit]
  );

  const header = ['ID', 'Тип', 'Время', 'Филиал', 'Сотрудник', 'Клиент', 'Источник', 'Внешний ID', 'Метрики'];
  const rows = (res?.rows || []).map(r => [
    r.id,
    r.event_type,
    r.event_time,
    r.branch_id || '',
    r.employee_id || '',
    r.client_id || '',
    r.source_id,
    r.external_id || '',
    escapeCsv(JSON.stringify(r.metric_values || {})),
  ].join(';'));

  return BOM + [header.join(';'), ...rows].join('\r\n');
}

/**
 * Export report: monthly metric summary across branches with plan/fact.
 *
 * @param {Object} opts
 * @param {string} opts.period — YYYY-MM
 * @param {string[]} [opts.metricIds] — specific metrics, or all if empty
 * @param {string[]} [opts.branchIds]
 * @returns {Promise<string>}
 */
export async function exportMonthlyReport(opts) {
  if (!isDbConnected()) return `${BOM}Error: Database not connected`;

  const { period, metricIds, branchIds } = opts;
  if (!period) return `${BOM}Error: period required`;

  // Get metric definitions
  let metricCondition = '';
  const params = [];
  let idx = 1;

  if (metricIds?.length) {
    metricCondition = `AND md.id = ANY($${idx})`;
    params.push(metricIds);
    idx++;
  }

  const metricsRes = await query(
    `SELECT id, name, unit, metric_type FROM metric_definitions WHERE enabled = true ${metricCondition} ORDER BY display_order`,
    params
  );
  const metrics = metricsRes?.rows || [];
  if (!metrics.length) return `${BOM}Нет метрик`;

  // Get branch names
  let branchFilter = '';
  const branchParams = [];
  if (branchIds?.length) {
    branchFilter = `WHERE id = ANY($1)`;
    branchParams.push(branchIds);
  }
  const branchRes = await query(
    `SELECT id, name FROM dim_branches ${branchFilter} ORDER BY name`,
    branchParams
  );
  const branches = branchRes?.rows || [];
  if (!branches.length) return `${BOM}Нет филиалов`;

  // Build header: Metric | Unit | Branch1 Fact | Branch1 Plan | Branch2 Fact | ...
  const header = ['Метрика', 'Ед.'];
  for (const b of branches) {
    header.push(`${b.name} Факт`, `${b.name} План`);
  }
  header.push('Итого Факт', 'Итого План');

  const rows = [];
  const dateFrom = `${period}-01`;
  const lastDay = new Date(parseInt(period.slice(0, 4)), parseInt(period.slice(5, 7)), 0).getDate();
  const dateTo = `${period}-${String(lastDay).padStart(2, '0')}`;

  for (const m of metrics) {
    const row = [escapeCsv(m.name), m.unit || ''];

    // Get fact from snapshots
    const factRes = await query(`
      SELECT branch_id, COALESCE(SUM(fact_value), 0) AS fact
      FROM metric_snapshots
      WHERE metric_id = $1 AND period_type = 'day'
        AND period_key >= $2 AND period_key <= $3
        AND branch_id IS NOT NULL
      GROUP BY branch_id
    `, [m.id, dateFrom, dateTo]);
    const factMap = new Map((factRes?.rows || []).map(r => [r.branch_id, parseFloat(r.fact)]));

    // Get plans
    const planRes = await query(`
      SELECT scope_id, plan_value FROM metric_plans
      WHERE metric_id = $1 AND period = $2 AND scope = 'branch'
    `, [m.id, period]);
    const planMap = new Map((planRes?.rows || []).map(r => [r.scope_id, parseFloat(r.plan_value)]));

    let totalFact = 0;
    let totalPlan = 0;

    for (const b of branches) {
      const fact = factMap.get(b.id) || 0;
      const plan = planMap.get(b.id) || 0;
      row.push(formatNumber(fact), formatNumber(plan));
      totalFact += fact;
      totalPlan += plan;
    }

    row.push(formatNumber(totalFact), formatNumber(totalPlan));
    rows.push(row.join(';'));
  }

  const title = `Отчет за ${period}`;
  return BOM + [title, '', header.join(';'), ...rows].join('\r\n');
}

// ==================== Helpers ====================

function escapeCsv(str) {
  if (!str) return '';
  const s = String(str);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatNumber(n) {
  if (n == null) return '';
  const num = parseFloat(n);
  if (!Number.isFinite(num)) return '';
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}
