/**
 * Forecast engine for predictive metric projections.
 *
 * Calculates predicted end-of-month values based on current fact,
 * elapsed/remaining working days, and metric type.
 *
 * Supports:
 * - Linear extrapolation (default for absolute/sum metrics)
 * - Current value pass-through (for averaged/percentage metrics)
 * - Custom formulas with {fact}, {plan}, {daily_avg}, etc.
 */

import { evaluate } from './formula-engine.js';
import {
  isWorkingDay,
  getWorkingDaysInMonth,
  getWorkingDaysInRange,
  getCalendarDaysInMonth,
} from './plan-prorate.js';

/**
 * Build temporal context for forecast calculations.
 *
 * @param {number} [remainingWorkingDays] - Pre-calculated remaining working days (optional, for backward compat)
 * @param {Date} [now] - Override for testing
 * @returns {object} dateContext
 */
export function buildDateContext(remainingWorkingDays, now) {
  const today = now || new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const totalWorkingDays = getWorkingDaysInMonth(year, month);
  const totalCalendarDays = getCalendarDaysInMonth(year, month);

  // Elapsed working days: from month start up to and including today
  const elapsedWorkingDays = getWorkingDaysInRange(monthStart, today);

  // Remaining working days: use provided value or calculate
  const remaining = remainingWorkingDays != null
    ? remainingWorkingDays
    : totalWorkingDays - elapsedWorkingDays;

  // Elapsed calendar days (including today)
  const elapsedCalendarDays = Math.floor((today - monthStart) / (1000 * 60 * 60 * 24)) + 1;

  return {
    today,
    monthStart,
    monthEnd,
    elapsedWorkingDays,
    remainingWorkingDays: Math.max(0, remaining),
    totalWorkingDays,
    elapsedCalendarDays,
    totalCalendarDays,
  };
}

/**
 * Calculate predictive forecast for a metric.
 *
 * @param {object} metricCfg - DashboardMetricConfig with forecastMethod, forecastFormula, metricType
 * @param {number} fact - Current actual value
 * @param {number} plan - Target plan value
 * @param {object} dateContext - From buildDateContext()
 * @returns {{ predictedValue: number, predictedCompletion: number, method: string, dailyRate: number|null } | null}
 */
export function calculateForecast(metricCfg, fact, plan, dateContext) {
  // Disabled or computed metrics — skip
  if (metricCfg.forecastMethod === 'disabled') return null;
  if (metricCfg.metricType === 'computed') return null;

  const { elapsedWorkingDays, remainingWorkingDays, totalWorkingDays } = dateContext;

  // Not enough data (month hasn't started or no working days yet)
  if (elapsedWorkingDays <= 0) return null;
  if (plan <= 0) return null;

  // Custom formula takes priority
  if (metricCfg.forecastMethod === 'custom' && metricCfg.forecastFormula) {
    return _evaluateCustomFormula(metricCfg, fact, plan, dateContext);
  }

  // Auto-detect method based on metricType
  const mt = metricCfg.metricType;
  if (mt === 'averaged' || mt === 'percentage') {
    return _forecastCurrentValue(fact, plan);
  }

  // Default: linear extrapolation (for 'absolute' and untyped metrics)
  return _forecastLinear(fact, plan, elapsedWorkingDays, remainingWorkingDays);
}

/**
 * Linear extrapolation: project daily rate to end of month.
 */
function _forecastLinear(fact, plan, elapsedWorkingDays, remainingWorkingDays) {
  const dailyRate = fact / elapsedWorkingDays;
  const predictedValue = Math.round(fact + dailyRate * remainingWorkingDays);
  const predictedCompletion = plan > 0
    ? Math.round((predictedValue / plan) * 100 * 100) / 100
    : 0;

  return {
    predictedValue,
    predictedCompletion,
    method: 'linear',
    dailyRate: Math.round(dailyRate * 100) / 100,
  };
}

/**
 * Current value pass-through for averaged/percentage metrics.
 * The current average IS the forecast (these don't accumulate).
 */
function _forecastCurrentValue(fact, plan) {
  const predictedCompletion = plan > 0
    ? Math.round((fact / plan) * 100 * 100) / 100
    : 0;

  return {
    predictedValue: fact,
    predictedCompletion,
    method: 'current_value',
    dailyRate: null,
  };
}

/**
 * Evaluate a custom forecast formula.
 * Falls back to linear extrapolation on error.
 */
function _evaluateCustomFormula(metricCfg, fact, plan, dateContext) {
  const { elapsedWorkingDays, remainingWorkingDays, totalWorkingDays,
    elapsedCalendarDays, totalCalendarDays } = dateContext;

  const dailyAvg = elapsedWorkingDays > 0 ? fact / elapsedWorkingDays : 0;
  const completionPct = plan > 0 ? (fact / plan) * 100 : 0;

  // Build variables map for formula evaluation
  const values = {
    fact,
    plan,
    elapsed_working_days: elapsedWorkingDays,
    remaining_working_days: remainingWorkingDays,
    total_working_days: totalWorkingDays,
    daily_avg: dailyAvg,
    completion_pct: completionPct,
    elapsed_calendar_days: elapsedCalendarDays,
    total_calendar_days: totalCalendarDays,
  };

  const { result, error } = evaluate(metricCfg.forecastFormula, values);

  if (error) {
    // Fallback to linear on formula error
    console.warn(`[forecast-engine] Formula error for metric ${metricCfg.id}: ${error}, falling back to linear`);
    return _forecastLinear(fact, plan, elapsedWorkingDays, remainingWorkingDays);
  }

  const predictedValue = Math.round(result);
  const predictedCompletion = plan > 0
    ? Math.round((predictedValue / plan) * 100 * 100) / 100
    : 0;

  return {
    predictedValue,
    predictedCompletion,
    method: 'custom',
    dailyRate: elapsedWorkingDays > 0 ? Math.round(dailyAvg * 100) / 100 : null,
  };
}
