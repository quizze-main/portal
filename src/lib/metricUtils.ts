import type { DashboardMetricConfig } from './internalApiClient';

// ─── Working days utilities ───

/** Returns true if the date is a working day (Mon-Fri) */
export function isWorkingDay(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

/** Count working days (Mon-Fri) in a given month (0-based month) */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (isWorkingDay(new Date(year, month, d))) count++;
  }
  return count;
}

/** Count working days (Mon-Fri) in a date range [from, to] inclusive */
export function getWorkingDaysInRange(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    if (isWorkingDay(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// ─── Metric row builder ───

/** Build ordered list: parent metrics first, children indented below */
export function buildMetricRows(metrics: DashboardMetricConfig[]) {
  const parents = metrics.filter(m => !m.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const childrenByParent = new Map<string, DashboardMetricConfig[]>();
  for (const m of metrics) {
    if (m.parentId) {
      const arr = childrenByParent.get(m.parentId) || [];
      arr.push(m);
      childrenByParent.set(m.parentId, arr);
    }
  }

  const rows: { metric: DashboardMetricConfig; isChild: boolean }[] = [];
  for (const p of parents) {
    rows.push({ metric: p, isChild: false });
    const children = childrenByParent.get(p.id) || [];
    for (const c of children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      rows.push({ metric: c, isChild: true });
    }
  }
  // Also add orphan children (parentId set but parent not in manual metrics)
  for (const m of metrics) {
    if (m.parentId && !parents.find(p => p.id === m.parentId)) {
      if (!rows.find(r => r.metric.id === m.id)) {
        rows.push({ metric: m, isChild: true });
      }
    }
  }
  return rows;
}
