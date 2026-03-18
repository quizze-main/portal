/**
 * Plan pro-rating module.
 * Extracted from internal-api.js for reuse across metric sources.
 * Supports: working_days, calendar_days, none.
 */

export const isWorkingDay = (d) => {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
};

export const getWorkingDaysInMonth = (year, month) => {
  const days = new Date(year, month + 1, 0).getDate();
  let c = 0;
  for (let d = 1; d <= days; d++) {
    if (isWorkingDay(new Date(year, month, d))) c++;
  }
  return c;
};

export const getWorkingDaysInRange = (from, to) => {
  let c = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    if (isWorkingDay(cur)) c++;
    cur.setDate(cur.getDate() + 1);
  }
  return c;
};

export const getCalendarDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getCalendarDaysInRange = (from, to) => {
  const f = new Date(from);
  f.setHours(0, 0, 0, 0);
  const t = new Date(to);
  t.setHours(0, 0, 0, 0);
  return Math.round((t - f) / (1000 * 60 * 60 * 24)) + 1;
};

/** Parse YYYY-MM-DD to local Date (avoids UTC midnight issues) */
export const parseLocalDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
};

/** Get ISO week key (YYYY-W##) for a YYYY-MM-DD date string */
export const getISOWeekKey = (dateStr) => {
  const d = parseLocalDate(dateStr);
  const dayOfWeek = d.getDay() || 7; // Mon=1 ... Sun=7
  d.setDate(d.getDate() + 4 - dayOfWeek); // Thursday of the same week
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

/**
 * Pro-rate a monthly plan value for a date sub-range within a month.
 *
 * @param {number} monthlyPlan - Full month plan value
 * @param {string} method - 'working_days' | 'calendar_days' | 'none'
 * @param {number} year - Year
 * @param {number} month - Month (0-indexed)
 * @param {Date} rangeStart - Start of date range (clamped to month)
 * @param {Date} rangeEnd - End of date range (clamped to month)
 * @returns {number}
 */
export const proRatePlan = (monthlyPlan, method, year, month, rangeStart, rangeEnd) => {
  if (method === 'none') return monthlyPlan;

  if (method === 'calendar_days') {
    const totalDays = getCalendarDaysInMonth(year, month);
    const rangeDays = getCalendarDaysInRange(rangeStart, rangeEnd);
    return totalDays > 0 ? Math.round(monthlyPlan * rangeDays / totalDays) : 0;
  }

  // Default: working_days
  const totalWd = getWorkingDaysInMonth(year, month);
  const rangeWd = getWorkingDaysInRange(rangeStart, rangeEnd);
  return totalWd > 0 ? Math.round(monthlyPlan * rangeWd / totalWd) : 0;
};
