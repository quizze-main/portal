import React, { memo, useMemo, useState } from 'react';
import { useMultiMetricDailyGraph } from '@/hooks/useMultiMetricDailyGraph';
import { MultiSeriesChart } from '@/components/dashboard/MultiSeriesChart';
import type { ChartWidgetConfig, ChartMetricSeries } from '@/lib/internalApiClient';
import { normalizeChartConfig } from '@/lib/internalApiClient';
import type { IntegratedBarChartDataPoint } from '@/components/dashboard/IntegratedBarChart';
import { METRIC_NAMES, METRIC_UNITS } from '@/hooks/useLeaderMetrics';
import { Loader2, AlertCircle, ChevronDown, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartWidgetProps {
  config: ChartWidgetConfig;
  title: string;
  storeIds: string[];
  dateFrom?: string;
  dateTo?: string;
  /** Hide the built-in header (title + collapse) — useful when embedded in another container */
  hideHeader?: boolean;
  /** Force collapsed state (e.g. in edit mode for large widgets) */
  forceCollapsed?: boolean;
  /** Compact preview mode for admin dashboard — small chart, no controls */
  compact?: boolean;
}

// ─── Formatters ─────────────────────────────────────────────────────

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}М`;
  if (value >= 1000) return `${Math.round(value / 1000)}К`;
  return String(Math.round(value));
};

const formatFullNum = (value: number): string =>
  Math.round(value).toLocaleString('ru-RU');

const formatByUnit = (value: number, metricCode: string, compact: boolean): string => {
  const unit = METRIC_UNITS[metricCode];
  if (unit === '%') return `${Math.round(value)}%`;
  return compact ? formatCompact(value) : formatFullNum(value);
};

// ─── Table for selected metric ──────────────────────────────────────

type SortState = { field: 'fact' | 'plan'; dir: 'asc' | 'desc' } | null;

function ChartTable({ data, metricCode }: { data: IntegratedBarChartDataPoint[]; metricCode: string }) {
  const [sort, setSort] = useState<SortState>(null);
  const pastData = data.filter(d => !d.isFuture);

  const toggleSort = (field: 'fact' | 'plan') => {
    setSort(prev =>
      prev?.field === field
        ? prev.dir === 'desc' ? { field, dir: 'asc' } : null
        : { field, dir: 'desc' }
    );
  };

  const rows = useMemo(() => {
    if (!sort) return pastData;
    const key = sort.field === 'fact' ? 'value' : 'plan';
    const sorted = [...pastData].sort((a, b) => b[key] - a[key]);
    return sort.dir === 'asc' ? sorted.reverse() : sorted;
  }, [pastData, sort]);

  const fmtFull = (v: number) => formatByUnit(v, metricCode, false);
  const fmtShort = (v: number) => formatByUnit(v, metricCode, true);

  if (pastData.length === 0) return null;

  return (
    <div className="min-w-0 lg:flex lg:flex-col lg:h-full">
      <div className="grid grid-cols-[1fr_5.5rem_5rem_1rem] lg:grid-cols-[1fr_3.5rem_3.5rem_1rem] px-2 py-1.5 border-b text-[10px] text-muted-foreground font-medium lg:flex-shrink-0">
        <span>Дата</span>
        <button type="button" onClick={() => toggleSort('fact')} className="text-right pr-[25px] lg:pr-0 hover:text-foreground transition-colors cursor-pointer select-none">
          Факт{sort?.field === 'fact' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('plan')} className="text-right pr-[25px] lg:pr-0 hover:text-foreground transition-colors cursor-pointer select-none">
          План{sort?.field === 'plan' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </button>
        <span />
      </div>
      <div className="overflow-y-auto max-h-[250px] lg:max-h-[280px] lg:flex-1 lg:min-h-0">
        {rows.map((day, i) => {
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
                <span className="lg:hidden">{fmtFull(day.value)}</span>
                <span className="hidden lg:inline">{fmtShort(day.value)}</span>
              </span>
              <span className="text-right text-muted-foreground tabular-nums">
                <span className="lg:hidden">{fmtFull(day.plan)}</span>
                <span className="hidden lg:inline">{fmtShort(day.plan)}</span>
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
}

// ─── Main widget ────────────────────────────────────────────────────

function ChartWidgetInner({ config, title, storeIds, dateFrom, dateTo, hideHeader, forceCollapsed, compact }: ChartWidgetProps) {
  // Normalize legacy config
  const normalized = useMemo(() => normalizeChartConfig(config), [config]);
  const metricSeries = normalized.metricSeries;

  // Visibility toggle state — all visible by default
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const visibleSeries = useMemo(
    () => new Set(metricSeries.filter(s => !hiddenSeries.has(s.metricCode)).map(s => s.metricCode)),
    [metricSeries, hiddenSeries]
  );

  // Collapsed state — forceCollapsed overrides user toggle
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = forceCollapsed ?? collapsed;

  // Table shows data for the first visible metric
  const [tableMetricCode, setTableMetricCode] = useState<string>(metricSeries[0]?.metricCode || '');

  // Plan visibility toggle
  const [hidePlans, setHidePlans] = useState(false);

  // Table visibility toggle (hidden by default on mobile for cleaner look)
  const [showTable, setShowTable] = useState(false);

  const toggleSeries = (code: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Fetch all metrics in parallel
  const { seriesData, isLoading, error } = useMultiMetricDailyGraph({
    metricSeries,
    dateFrom,
    dateTo,
    subjectType: normalized.subjectType,
    subjectIds: storeIds,
    isAggregated: normalized.isAggregated,
    enabled: storeIds.length > 0 && !!dateFrom && !!dateTo,
  });

  const hasData = Object.values(seriesData).some(d => d.length > 0);

  // Resolve title
  const displayTitle = title || (metricSeries.length === 1
    ? `График: ${METRIC_NAMES[metricSeries[0].metricCode] || metricSeries[0].metricCode}`
    : 'График');

  // Table data for selected metric
  const tableData = seriesData[tableMetricCode] || seriesData[metricSeries[0]?.metricCode] || [];

  const isSingleMetric = metricSeries.length === 1;

  // Compact mode: just the chart, nothing else
  if (compact) {
    return (
      <div>
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-[10px] text-destructive py-4 justify-center">
            <AlertCircle className="w-3 h-3" />
            <span>Ошибка загрузки</span>
          </div>
        )}
        {!error && !isLoading && !hasData && (
          <div className="text-[10px] text-muted-foreground py-4 text-center">Нет данных</div>
        )}
        {!error && hasData && (
          <div className="max-h-[130px] overflow-hidden">
            <MultiSeriesChart
              seriesData={seriesData}
              series={metricSeries}
              visibleSeries={visibleSeries}
              height={120}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={hideHeader ? undefined : "bg-card border rounded-xl p-3 lg:p-4"}>
      {/* Header — clickable to collapse/expand */}
      {!hideHeader && (
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className="flex items-center gap-2 w-full text-left mb-1 cursor-pointer select-none group"
        >
          <h3 className="text-sm font-semibold">{displayTitle}</h3>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isCollapsed && "-rotate-90"
          )} />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
        </button>
      )}
      {hideHeader && isLoading && (
        <div className="flex justify-end mb-1">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Collapsible content */}
      {(hideHeader || !isCollapsed) && (
        <div className="lg:flex lg:flex-row lg:gap-4 mt-2">
          {/* Left: chart + legend */}
          <div className="flex-1 min-w-0 lg:flex lg:flex-col">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive py-4">
                <AlertCircle className="w-4 h-4" />
                <span>Ошибка загрузки данных</span>
              </div>
            )}

            {/* Empty */}
            {!error && !isLoading && !hasData && (
              <div className="text-xs text-muted-foreground py-8 text-center">
                Нет данных за выбранный период
              </div>
            )}

            {/* Chart + Legend */}
            {!error && hasData && (
              <>
                <div className="min-w-0 lg:flex-1">
                  <MultiSeriesChart
                    seriesData={seriesData}
                    series={metricSeries}
                    visibleSeries={visibleSeries}
                    height={220}
                    onToggleSeries={!isSingleMetric ? toggleSeries : undefined}
                    hidePlans={hidePlans}
                    onTogglePlans={() => setHidePlans(prev => !prev)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right: table for selected metric (desktop: side panel) — togglable */}
          {!error && hasData && tableData.length > 0 && (
            <div className={cn(
              "overflow-hidden text-xs",
              showTable
                ? "mt-3 border-t lg:mt-0 lg:border-t-0 lg:border-l lg:w-[220px] lg:flex-shrink-0 lg:self-stretch"
                : "mt-1"
            )}>
              {/* Toggle button */}
              <button
                type="button"
                onClick={() => setShowTable(prev => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>{showTable ? 'Скрыть таблицу' : 'Показать таблицу'}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showTable && "rotate-180")} />
              </button>
              {showTable && (
                <>
                  {/* Metric selector for table (when multiple series) */}
                  {metricSeries.length > 1 && (
                    <div className="px-2 py-1.5 border-b flex gap-1 overflow-x-auto">
                      {metricSeries.map(s => (
                        <button
                          key={s.metricCode}
                          type="button"
                          onClick={() => setTableMetricCode(s.metricCode)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer",
                            tableMetricCode === s.metricCode
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {METRIC_NAMES[s.metricCode] || s.metricCode}
                        </button>
                      ))}
                    </div>
                  )}
                  <ChartTable data={tableData} metricCode={tableMetricCode || metricSeries[0]?.metricCode} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ChartWidget = memo(ChartWidgetInner);
