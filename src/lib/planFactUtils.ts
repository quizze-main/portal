// Plan/Fact dashboard utilities

export const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
export const MONTH_NAMES_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function sumMap(map: Map<string, number> | undefined): number {
  if (!map) return 0;
  let s = 0;
  map.forEach(v => { s += v; });
  return s;
}

export function filledCount(map: Map<string, number> | undefined): number {
  if (!map) return 0;
  let c = 0;
  map.forEach(v => { if (v > 0) c++; });
  return c;
}

export function fmtNum(n: number): string {
  if (n === 0) return '0';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Color class for completion percent */
export function completionColor(percent: number | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (percent == null) return 'gray';
  if (percent >= 95) return 'green';
  if (percent >= 70) return 'yellow';
  return 'red';
}

export function completionBgClass(color: 'green' | 'yellow' | 'red' | 'gray'): string {
  switch (color) {
    case 'green': return 'bg-emerald-50 dark:bg-emerald-950/30';
    case 'yellow': return 'bg-amber-50 dark:bg-amber-950/30';
    case 'red': return 'bg-red-50 dark:bg-red-950/30';
    case 'gray': return 'bg-muted/30';
  }
}

export function completionTextClass(color: 'green' | 'yellow' | 'red' | 'gray'): string {
  switch (color) {
    case 'green': return 'text-emerald-600 dark:text-emerald-400';
    case 'yellow': return 'text-amber-600 dark:text-amber-400';
    case 'red': return 'text-red-500 dark:text-red-400';
    case 'gray': return 'text-muted-foreground';
  }
}

export function completionDotClass(color: 'green' | 'yellow' | 'red' | 'gray'): string {
  switch (color) {
    case 'green': return 'bg-emerald-500';
    case 'yellow': return 'bg-amber-500';
    case 'red': return 'bg-red-500';
    case 'gray': return 'bg-muted-foreground/30';
  }
}

/** Derive overall branch health color from metric-level breakdown */
export function getBranchOverallColor(h: { green: number; yellow: number; red: number; gray: number }): 'green' | 'yellow' | 'red' | 'gray' {
  const total = h.green + h.yellow + h.red + h.gray;
  if (total === 0 || h.gray === total) return 'gray';
  if (h.red > 0) return 'red';
  if (h.yellow > 0) return 'yellow';
  return 'green';
}
