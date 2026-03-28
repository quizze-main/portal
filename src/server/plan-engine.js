/**
 * Plan Engine — dynamic daily plan calculation.
 *
 * For absolute metrics: dailyPlan = (monthPlan - factSoFar) / remainingWorkingDays
 * For averaged/percentage: plan is constant for the entire period.
 *
 * Uses existing plan-prorate.js helpers for working/calendar days counting.
 */

import { isWorkingDay, getWorkingDaysInRange, getCalendarDaysInRange, parseLocalDate, getScheduleWorkingDaysInRange } from './plan-prorate.js';
import { isPrismaConnected as isDbConnected, rawQuery as query } from './prisma.js';

/**
 * Calculate dynamic daily plan for an absolute metric.
 * When employeeId is provided and method is 'working_days', uses actual
 * shift schedule data (falling back to Mon-Fri if no schedule exists).
 *
 * @param {number} periodPlan       — total plan for the period (e.g. month)
 * @param {number} factSoFar        — accumulated fact from period start to today
 * @param {Date|string} today       — current date
 * @param {Date|string} periodEnd   — last day of the period
 * @param {'working_days'|'calendar_days'} method — which days to count
 * @param {string} [employeeId]     — if provided, uses shift schedule for working days
 * @returns {Promise<{ dailyPlan: number, remainingDays: number, remainingPlan: number, completionPercent: number }>}
 */
export async function dynamicDailyPlan(periodPlan, factSoFar, today, periodEnd, method = 'working_days', employeeId) {
  const todayDate = typeof today === 'string' ? parseLocalDate(today) : today;
  const endDate = typeof periodEnd === 'string' ? parseLocalDate(periodEnd) : periodEnd;

  // Tomorrow is the first "remaining" day (today is already partially done)
  const tomorrow = new Date(todayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let remaining;
  if (method === 'working_days' && employeeId) {
    remaining = await getScheduleWorkingDaysInRange(tomorrow, endDate, employeeId);
  } else if (method === 'working_days') {
    remaining = getWorkingDaysInRange(tomorrow, endDate);
  } else {
    remaining = getCalendarDaysInRange(tomorrow, endDate);
  }

  const remainingPlan = Math.max(0, periodPlan - factSoFar);
  const completionPercent = periodPlan > 0 ? Math.round((factSoFar / periodPlan) * 10000) / 100 : 0;

  return {
    dailyPlan: remaining > 0 ? Math.round(remainingPlan / remaining) : 0,
    remainingDays: remaining,
    remainingPlan,
    completionPercent,
  };
}

/**
 * Get period boundaries for a given date.
 *
 * @param {string} period — 'YYYY-MM' for month, 'YYYY-QN' for quarter, 'YYYY' for year
 * @returns {{ start: string, end: string }} — YYYY-MM-DD boundaries
 */
export function getPeriodBoundaries(period) {
  // Month: '2026-03'
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${period}-01`,
      end: `${period}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  // Quarter: '2026-Q1'
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) {
    const y = parseInt(qMatch[1]);
    const q = parseInt(qMatch[2]);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const lastDay = new Date(y, endMonth, 0).getDate();
    return {
      start: `${y}-${String(startMonth).padStart(2, '0')}-01`,
      end: `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  // Year: '2026'
  if (/^\d{4}$/.test(period)) {
    return { start: `${period}-01-01`, end: `${period}-12-31` };
  }

  // Default to current month
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
}

/**
 * Fetch dynamic plan for a metric from the database.
 * Resolves plan hierarchically: employee → branch → network.
 * Then calculates remaining daily plan based on current fact.
 *
 * @param {string} metricId
 * @param {Object} opts
 * @param {string} [opts.branchId]
 * @param {string} [opts.employeeId]
 * @param {string} [opts.period] — e.g. '2026-03'
 * @returns {Promise<Object|null>}
 */
export async function getDynamicPlan(metricId, { branchId, employeeId, period } = {}) {
  if (!isDbConnected()) return null;

  // Determine period
  if (!period) {
    const now = new Date();
    period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const { start, end } = getPeriodBoundaries(period);

  // Get metric definition for type and prorate method
  const defRes = await query(
    'SELECT metric_type, plan_prorate_method FROM metric_definitions WHERE id = $1',
    [metricId]
  );
  const def = defRes?.rows?.[0];
  if (!def) return null;

  // Hierarchical plan resolution: employee → branch → network
  let planValue = null;
  const scopes = [];
  if (employeeId) scopes.push({ scope: 'employee', scopeId: employeeId });
  if (branchId) scopes.push({ scope: 'branch', scopeId: branchId });
  scopes.push({ scope: 'network', scopeId: '*' });

  for (const { scope, scopeId } of scopes) {
    const planRes = await query(
      'SELECT plan_value FROM metric_plans WHERE metric_id = $1 AND scope = $2 AND scope_id = $3 AND period = $4',
      [metricId, scope, scopeId, period]
    );
    if (planRes?.rows?.[0]) {
      planValue = parseFloat(planRes.rows[0].plan_value);
      break;
    }
  }

  if (planValue === null) return null;

  // For averaged/percentage metrics, daily plan = full plan (constant)
  if (def.metric_type === 'averaged' || def.metric_type === 'percentage') {
    return {
      metricId,
      period,
      planValue,
      metricType: def.metric_type,
      dailyPlan: planValue,
      remainingDays: null,
      remainingPlan: null,
      completionPercent: null,
      note: 'Plan is constant for averaged/percentage metrics',
    };
  }

  // For absolute metrics: get accumulated fact, calculate dynamic daily plan
  const conditions = ['s.metric_id = $1', 's.period_type = $2', 's.period_key >= $3', 's.period_key <= $4'];
  const params = [metricId, 'day', start, end];
  let paramIdx = 5;

  if (branchId) {
    conditions.push(`s.branch_id = $${paramIdx}`);
    params.push(branchId);
    paramIdx++;
  }
  if (employeeId) {
    conditions.push(`s.employee_id = $${paramIdx}`);
    params.push(employeeId);
    paramIdx++;
  }

  const factRes = await query(
    `SELECT COALESCE(SUM(s.fact_value), 0) AS fact FROM metric_snapshots s WHERE ${conditions.join(' AND ')}`,
    params
  );
  const factSoFar = parseFloat(factRes?.rows?.[0]?.fact) || 0;

  const today = new Date().toISOString().slice(0, 10);
  const method = def.plan_prorate_method || 'working_days';

  const result = await dynamicDailyPlan(planValue, factSoFar, today, end, method, employeeId);

  return {
    metricId,
    period,
    planValue,
    factSoFar,
    metricType: def.metric_type,
    ...result,
  };
}
