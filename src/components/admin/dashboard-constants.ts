import { BRANCHES, POSITIONS } from '@/data/branchData';

// ─── Source Labels ───
export const SOURCE_LABELS: Record<string, string> = {
  tracker: 'Tracker',
  manual: 'Ручной ввод',
  external_api: 'Внешний API',
  computed: 'Формула',
};

export const SOURCE_COLORS: Record<string, string> = {
  tracker: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  manual: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  external_api: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  computed: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

// ─── Scope Labels ───
export const SCOPE_LABELS: Record<string, string> = {
  network: 'Сеть',
  branch: 'Филиал',
  employee: 'Сотрудник',
};

export const SCOPE_COLORS: Record<string, string> = {
  network: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  branch: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  employee: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

// ─── V2 Metric Classification ───
export const METRIC_TYPE_LABELS: Record<string, string> = {
  absolute: 'Абсолютная',
  averaged: 'Средняя',
  percentage: 'Процентная',
  computed: 'Вычисляемая',
};

export const VALUE_TYPE_LABELS: Record<string, string> = {
  currency: 'Деньги (₽)',
  count: 'Штуки (шт)',
  percentage: 'Проценты (%)',
  ratio: 'Коэффициент',
  duration: 'Длительность',
  score: 'Оценка',
};

export const AGGREGATION_LABELS: Record<string, string> = {
  sum: 'Сумма',
  simple_average: 'Среднее',
  weighted_average: 'Взвеш. среднее',
  last: 'Последнее',
  min: 'Минимум',
  max: 'Максимум',
};

// ─── Plan Period & Pro-rate ───
export const PLAN_PERIOD_LABELS: Record<string, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
};

export const PRORATE_METHOD_LABELS: Record<string, string> = {
  working_days: 'Рабочие дни',
  calendar_days: 'Календарные дни',
  none: 'Без пропорции',
};

// ─── Dashboard Positions ───
export const DASHBOARD_POSITIONS: { id: string; label: string }[] = [
  { id: 'leader', label: 'Руководитель' },
  ...POSITIONS.reduce<{ id: string; label: string }[]>((acc, p) => {
    if (!acc.some(x => x.id === p.id)) acc.push({ id: p.id, label: p.name });
    return acc;
  }, []),
];

// ─── Shared Helpers ───
export type PeriodType = 'month' | 'quarter' | 'year';

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
};

export function generatePeriodOptions(periodType: PeriodType = 'month'): string[] {
  const now = new Date();
  const options: string[] = [];

  if (periodType === 'quarter') {
    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
      for (let q = 1; q <= 4; q++) {
        options.push(`${y}-Q${q}`);
      }
    }
  } else if (periodType === 'year') {
    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
      options.push(`${y}`);
    }
  } else {
    for (let i = -3; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }

  return options;
}

export function getScopeLabel(scope: string, scopeId: string, storeOptions?: Array<{store_id: string, name: string}>): string {
  if (scope === 'network') return 'Вся сеть';
  if (scope === 'branch') {
    const store = storeOptions?.find(s => s.store_id === scopeId);
    if (store) return store.name;
    const branch = BRANCHES.find(b => b.id === scopeId);
    return branch ? branch.name : scopeId;
  }
  return scopeId;
}
