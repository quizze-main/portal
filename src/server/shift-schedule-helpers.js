/**
 * Shift Schedule Helpers — shared query functions for schedule integration.
 * Used by plan-prorate, salary calculator, and profile widget.
 * Supports dual storage: PostgreSQL + JSON file fallback.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPrismaConnected as isDbConnected, rawQuery as query } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENTRIES_PATH = path.resolve(__dirname, '../../data/shift-entries.json');

const WORK_TYPES = ['work', 'extra_shift'];

// ─── JSON fallback helpers ───

async function readAllEntriesJson() {
  try {
    if (!existsSync(ENTRIES_PATH)) return [];
    const raw = await readFile(ENTRIES_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

function filterEntries(entries, employeeId, dateFrom, dateTo) {
  return entries.filter(e =>
    e.employee_id === employeeId && e.date >= dateFrom && e.date <= dateTo
  );
}

function filterEntriesByBranch(entries, branchId, dateFrom, dateTo) {
  return entries.filter(e =>
    e.branch_id === branchId && e.date >= dateFrom && e.date <= dateTo
  );
}

// ─── Core query functions ───

/**
 * Check if any schedule data exists for an employee in a date range.
 * @param {string} employeeId
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
export async function hasScheduleData(employeeId, dateFrom, dateTo) {
  if (isDbConnected()) {
    try {
      const result = await query(
        'SELECT EXISTS(SELECT 1 FROM shift_entries WHERE employee_id = $1 AND date >= $2 AND date <= $3) AS has_data',
        [employeeId, dateFrom, dateTo]
      );
      return result?.rows?.[0]?.has_data === true;
    } catch { /* fall through to JSON */ }
  }

  const all = await readAllEntriesJson();
  return filterEntries(all, employeeId, dateFrom, dateTo).length > 0;
}

/**
 * Count working days (work + extra_shift) for an employee in a date range.
 * @param {string} employeeId
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @returns {Promise<{ total: number, breakdown: { work: number, extra_shift: number } }>}
 */
export async function getEmployeeWorkingDays(employeeId, dateFrom, dateTo) {
  if (isDbConnected()) {
    try {
      const result = await query(`
        SELECT shift_type, COUNT(*)::int AS cnt
        FROM shift_entries
        WHERE employee_id = $1 AND date >= $2 AND date <= $3
          AND shift_type IN ('work', 'extra_shift')
        GROUP BY shift_type
      `, [employeeId, dateFrom, dateTo]);

      const breakdown = { work: 0, extra_shift: 0 };
      for (const row of result?.rows || []) {
        breakdown[row.shift_type] = row.cnt;
      }
      return { total: breakdown.work + breakdown.extra_shift, breakdown };
    } catch { /* fall through to JSON */ }
  }

  const all = await readAllEntriesJson();
  const filtered = filterEntries(all, employeeId, dateFrom, dateTo)
    .filter(e => WORK_TYPES.includes(e.shift_type));

  const breakdown = { work: 0, extra_shift: 0 };
  for (const e of filtered) {
    if (breakdown[e.shift_type] !== undefined) breakdown[e.shift_type]++;
  }
  return { total: breakdown.work + breakdown.extra_shift, breakdown };
}

/**
 * Full schedule summary for an employee in a date range.
 * @param {string} employeeId
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @returns {Promise<{ workDays: number, extraShifts: number, daysOff: number, vacations: number, sickDays: number, absent: number, dayOffLieu: number, totalEntries: number, entries: Array }>}
 */
export async function getEmployeeScheduleSummary(employeeId, dateFrom, dateTo) {
  let entries = [];

  if (isDbConnected()) {
    try {
      const result = await query(`
        SELECT id, employee_id, branch_id, date::text, shift_type,
               shift_number, time_start::text, time_end::text, note
        FROM shift_entries
        WHERE employee_id = $1 AND date >= $2 AND date <= $3
        ORDER BY date
      `, [employeeId, dateFrom, dateTo]);
      entries = result?.rows || [];
    } catch {
      const all = await readAllEntriesJson();
      entries = filterEntries(all, employeeId, dateFrom, dateTo);
    }
  } else {
    const all = await readAllEntriesJson();
    entries = filterEntries(all, employeeId, dateFrom, dateTo);
  }

  const summary = {
    workDays: 0,
    extraShifts: 0,
    daysOff: 0,
    vacations: 0,
    sickDays: 0,
    absent: 0,
    dayOffLieu: 0,
    totalEntries: entries.length,
    entries,
  };

  for (const e of entries) {
    switch (e.shift_type) {
      case 'work': summary.workDays++; break;
      case 'extra_shift': summary.extraShifts++; break;
      case 'day_off': summary.daysOff++; break;
      case 'vacation': summary.vacations++; break;
      case 'sick': summary.sickDays++; break;
      case 'absent': summary.absent++; break;
      case 'day_off_lieu': summary.dayOffLieu++; break;
    }
  }

  return summary;
}

/**
 * Batch salary data for all employees in a branch for a month.
 * Returns map: { [employee_id]: { plannedWorkDays, actualWorkDays, extraShifts, dayOffLieu, sickDays, vacations } }
 * @param {string} branchId
 * @param {string} monthStart - YYYY-MM-DD (first day of month)
 * @param {string} monthEnd - YYYY-MM-DD (last day of month)
 * @param {string} [today] - YYYY-MM-DD (for actual vs planned split, defaults to today)
 * @returns {Promise<Record<string, object>>}
 */
export async function getBranchSalaryData(branchId, monthStart, monthEnd, today) {
  if (!today) {
    today = new Date().toISOString().slice(0, 10);
  }

  let entries = [];

  if (isDbConnected()) {
    try {
      const result = await query(`
        SELECT employee_id, date::text, shift_type
        FROM shift_entries
        WHERE branch_id = $1 AND date >= $2 AND date <= $3
        ORDER BY employee_id, date
      `, [branchId, monthStart, monthEnd]);
      entries = result?.rows || [];
    } catch {
      const all = await readAllEntriesJson();
      entries = filterEntriesByBranch(all, branchId, monthStart, monthEnd);
    }
  } else {
    const all = await readAllEntriesJson();
    entries = filterEntriesByBranch(all, branchId, monthStart, monthEnd);
  }

  const map = {};

  for (const e of entries) {
    if (!map[e.employee_id]) {
      map[e.employee_id] = {
        plannedWorkDays: 0,
        actualWorkDays: 0,
        extraShifts: 0,
        dayOffLieu: 0,
        sickDays: 0,
        vacations: 0,
      };
    }
    const emp = map[e.employee_id];

    switch (e.shift_type) {
      case 'work':
        emp.plannedWorkDays++;
        if (e.date <= today) emp.actualWorkDays++;
        break;
      case 'extra_shift':
        emp.extraShifts++;
        if (e.date <= today) emp.actualWorkDays++;
        break;
      case 'day_off_lieu':
        emp.dayOffLieu++;
        break;
      case 'sick':
        emp.sickDays++;
        break;
      case 'vacation':
        emp.vacations++;
        break;
    }
  }

  return map;
}
