import { memo, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegratedBarChart } from './IntegratedBarChart';
import type { IntegratedBarChartDataPoint } from './IntegratedBarChart';
import { PercentLineChart } from './PercentLineChart';
import type { FullWidthKPIMetric } from './KPIFullWidthCard';

interface ManagerMetricChartProps {
  metrics: FullWidthKPIMetric[];
  selectedMetricId: string;
  onMetricChange: (id: string) => void;
  chartData: IntegratedBarChartDataPoint[];
  unit: string;
}

type Grouping = 'day' | 'week' | 'month' | 'year';

const GROUPING_OPTIONS: { value: Grouping; label: string }[] = [
  { value: 'day', label: 'Д' },
  { value: 'week', label: 'Н' },
  { value: 'month', label: 'М' },
  { value: 'year', label: 'Г' },
];

const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
};

/** Компактный вид для 1-2 точек данных (период "день" / "3 дня") */
function SingleDayView({ data, unit, formatCompact: fmt }: {
  data: IntegratedBarChartDataPoint[];
  unit: string;
  formatCompact: (v: number) => string;
}) {
  const isPercent = unit === '%';
  const formatVal = (v: number) =>
    isPercent ? `${Math.round(v)}%` : fmt(v);

  return (
    <div className="flex flex-col gap-3 py-4">
      {data.map((day, i) => {
        const pct = day.plan > 0 ? Math.min((day.value / day.plan) * 100, 150) : 0;
        const isAbove = day.value >= day.plan;
        return (
          <div key={i} className="space-y-2">
            {/* Заголовок дня */}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {day.date}{day.dayOfWeek ? `, ${day.dayOfWeek}` : ''}
              </span>
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                isAbove ? "text-emerald-500" : "text-red-500"
              )}>
                {formatVal(day.value)}
              </span>
            </div>
            {/* Прогресс-бар */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all",
                  isAbove ? "bg-emerald-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
              {/* Маркер плана */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                style={{ left: `${Math.min(100, (day.plan / Math.max(day.value, day.plan)) * 100)}%` }}
              />
            </div>
            {/* План */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                План: <span className="font-medium">{formatVal(day.plan)}</span>
              </span>
              <span className={cn(
                "font-medium",
                isAbove ? "text-emerald-500" : "text-red-500"
              )}>
                {day.plan > 0 ? `${Math.round((day.value / day.plan) * 100)}%` : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Агрегация дневных данных по группировке */
function aggregateChartData(
  data: IntegratedBarChartDataPoint[],
  grouping: Grouping,
  unit: string
): IntegratedBarChartDataPoint[] {
  if (data.length === 0) return [];
  const isPercent = unit === '%';

  // Разбиваем на группы
  const groups: IntegratedBarChartDataPoint[][] = [];
  let currentGroup: IntegratedBarChartDataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const d = data[i];

    if (grouping === 'week') {
      if (i > 0 && i % 7 === 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    } else if (grouping === 'month') {
      // Новый месяц когда date (число) меньше предыдущего
      if (i > 0 && Number(d.date) < Number(data[i - 1].date)) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }
    // year — все в одну группу

    currentGroup.push(d);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Агрегируем каждую группу
  return groups.map((group) => {
    const sumValue = group.reduce((s, d) => s + d.value, 0);
    const sumPlan  = group.reduce((s, d) => s + d.plan, 0);
    const pastDays = group.filter(d => !d.isFuture).length;
    const allFuture = group.every(d => d.isFuture);

    let label: string;
    if (grouping === 'week') {
      label = group.length === 1
        ? group[0].date
        : `${group[0].date}-${group[group.length - 1].date}`;
    } else if (grouping === 'month') {
      // Определяем месяц по позиции первого дня (date="1" → начало месяца)
      const firstDay = Number(group[0].date);
      // Для year-периода может быть несколько месяцев; используем индекс группы
      label = firstDay <= 28 ? group[0].date : MONTH_SHORT[groups.indexOf(group) % 12] ?? group[0].date;
    } else {
      label = `${group[0].date}-${group[group.length - 1].date}`;
    }

    return {
      date: label,
      value: isPercent
        ? (pastDays > 0 ? Math.round(sumValue / pastDays) : 0)
        : Math.round(sumValue),
      plan: isPercent
        ? Math.round(sumPlan / group.length)
        : Math.round(sumPlan),
      isFuture: allFuture,
    };
  });
}

export const ManagerMetricChart = memo(function ManagerMetricChart({
  metrics,
  selectedMetricId,
  onMetricChange,
  chartData,
  unit,
}: ManagerMetricChartProps) {
  const [grouping, setGrouping] = useState<Grouping>('day');
  const [tableSort, setTableSort] = useState<{ field: 'fact' | 'plan'; dir: 'desc' | 'asc' } | null>(null);

  const displayData = useMemo(() => {
    if (grouping === 'day') return chartData;
    return aggregateChartData(chartData, grouping, unit);
  }, [chartData, grouping, unit]);

  const formatValue = (value: number): string => {
    if (unit === '%') return `${Math.round(value)}`;
    if (unit === 'шт') return String(Math.round(value));
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (value >= 1000) return `${Math.round(value / 1000)}`;
    return String(Math.round(value));
  };

  const formatTooltipValue = (value: number): string => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(value));
  };

  if (chartData.length === 0) return null;

  const isPercent = unit === '%';
  const pastData = displayData.filter(d => !d.isFuture);
  const isFewPoints = pastData.length <= 2 && displayData.length <= 3;

  // Только прошедшие дни для таблицы (будущие не показываем)
  const toggleSort = (field: 'fact' | 'plan') => {
    setTableSort(prev =>
      prev?.field === field
        ? prev.dir === 'desc' ? { field, dir: 'asc' } : null
        : { field, dir: 'desc' }
    );
  };

  const tableRows = useMemo(() => {
    if (!tableSort) return pastData;
    const key = tableSort.field === 'fact' ? 'value' : 'plan';
    const sorted = [...pastData].sort((a, b) => b[key] - a[key]);
    return tableSort.dir === 'asc' ? sorted.reverse() : sorted;
  }, [pastData, tableSort]);

  const formatTableFull = (value: number) =>
    isPercent ? `${Math.round(value)}%` : Math.round(value).toLocaleString('ru-RU');
  const formatTableShort = (value: number) =>
    isPercent ? `${Math.round(value)}%` : formatCompact(value);

  const table = (
    <div className="min-w-0 lg:flex lg:flex-col lg:h-full">
      {/* Заголовок таблицы */}
      <div className="grid grid-cols-[1fr_5.5rem_5rem_1rem] lg:grid-cols-[1fr_3.5rem_3.5rem_1rem] px-2 py-1.5 border-b text-[10px] text-muted-foreground font-medium lg:flex-shrink-0">
        <span>Дата</span>
        <button type="button" onClick={() => toggleSort('fact')} className="text-right pr-[25px] lg:pr-0 hover:text-foreground transition-colors cursor-pointer select-none">
          Факт{tableSort?.field === 'fact' ? (tableSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('plan')} className="text-right pr-[25px] lg:pr-0 hover:text-foreground transition-colors cursor-pointer select-none">
          План{tableSort?.field === 'plan' ? (tableSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </button>
        <span />
      </div>
      {/* Строки — мобильный: max 250px, десктоп: заполняет остаток высоты */}
      <div className="overflow-y-auto max-h-[250px] lg:max-h-none lg:flex-1 lg:min-h-0">
        {tableRows.map((day, i) => {
          const isAbove = day.value >= day.plan;
          return (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[1fr_5.5rem_5rem_1rem] lg:grid-cols-[1fr_3.5rem_3.5rem_1rem] px-2 py-1 text-xs",
                i % 2 === 1 && "bg-muted/30"
              )}
            >
              <span className="text-muted-foreground">
                {day.date}{day.dayOfWeek ? `, ${day.dayOfWeek.toLowerCase()}` : ''}
              </span>
              <span className={cn(
                "text-right font-bold tabular-nums",
                isAbove ? "text-emerald-500" : "text-red-500"
              )}>
                <span className="lg:hidden">{formatTableFull(day.value)}</span>
                <span className="hidden lg:inline">{formatTableShort(day.value)}</span>
              </span>
              <span className="text-right text-muted-foreground tabular-nums">
                <span className="lg:hidden">{formatTableFull(day.plan)}</span>
                <span className="hidden lg:inline">{formatTableShort(day.plan)}</span>
              </span>
              <span className={cn("text-center", isAbove ? "text-emerald-500" : "text-red-500")}>
                {isAbove ? '▲' : '▼'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border bg-card p-3 lg:p-4 lg:flex lg:flex-row lg:gap-4">
      {/* Left column: dropdown + chart + legend */}
      <div className="flex-1 min-w-0 lg:flex lg:flex-col">
        {/* Header: dropdown + группировка */}
        <div className="flex items-center justify-between mb-3 lg:flex-shrink-0">
          <Select value={selectedMetricId} onValueChange={onMetricChange}>
            <SelectTrigger className="w-auto min-w-[180px] h-8 text-sm font-semibold border-0 bg-transparent px-0 shadow-none focus:ring-0 [&>svg]:ml-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* TODO: Группировка (н/м/г) — скрыта, пока API не поддерживает */}
        </div>

        {/* Chart or single-day view */}
        <div className="min-w-0 lg:flex-1">
          {isFewPoints ? (
            <SingleDayView data={pastData} unit={unit} formatCompact={formatCompact} />
          ) : isPercent ? (
            <PercentLineChart data={displayData} />
          ) : (
            <IntegratedBarChart
              data={displayData}
              formatValue={formatValue}
              formatTooltipValue={formatTooltipValue}
              unit={unit}
              height={220}
            />
          )}
        </div>

        {/* Legend — скрываем для 1-2 точек */}
        <div className={cn("flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground lg:flex-shrink-0", isFewPoints && "hidden")}>
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            ≥ план
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            {'< план'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-muted-foreground/50 bg-background" />
            План
          </span>
        </>
        </div>
      </div>

      {/* Table — desktop: справа на всю высоту, без рамки, как часть карточки */}
      <div className={cn(
        "mt-3 border-t lg:mt-0 lg:border-t-0 lg:border-l lg:w-[220px] lg:flex-shrink-0 overflow-hidden lg:self-stretch lg:-my-4 lg:-mr-4 text-xs",
        isFewPoints && "hidden"
      )}>
        {table}
      </div>
    </div>
  );
});
