import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { ManagerRankingMobile } from './ManagerRankingMobile';
import { type DisplayMode, ManagerRankingRow } from './ManagerRankingCard';
import type { DateRange } from 'react-day-picker';
import type { BranchOption } from './BranchSelector';
import { internalApiClient } from '@/lib/internalApiClient';
import {
  useLeaderMetrics,
  toNumber,
  toNumberOrNull,
  ALL_METRIC_CODES,
  RANKING_METRIC_CONFIG,
  DEFAULT_MANAGER_RANKING_CODES,
  LOSS_COLUMN_CODE,
  buildRankingColumnDef,
  buildRankingColumnDefFromKnown,
  type RankingColumnDef,
  type ForecastLabelType,
} from '@/hooks/useLeaderMetrics';
import { RankingColumnsEditor } from './RankingColumnsEditor';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: string;
  label: string;
  currentSort: SortConfig;
  onSort: (field: string) => void;
  className?: string;
}

const SortableHeader = ({ field, label, currentSort, onSort, className = '' }: SortableHeaderProps) => {
  const isActive = currentSort.field === field;

  return (
    <th
      onClick={(e) => {
        e.stopPropagation();
        onSort(field);
      }}
      className={`cursor-pointer hover:bg-muted/80 transition-colors select-none ${className}`}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentSort.direction === 'desc'
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </div>
    </th>
  );
};

type ForecastLabel = 'forecast' | 'deviation';

interface MetricIndicator {
  value: number | null;
  plan: number | null;
  forecast: number | null;
  label: ForecastLabel;
}

const getPercentColor = (percent: number | null): string => {
  if (percent === null) return 'text-muted-foreground';
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const ForecastIndicator = ({ forecast, large = false }: { forecast: number | null; large?: boolean }) => {
  if (forecast === null) {
    return (
      <span className={`${large ? 'text-[11px] sm:text-sm font-medium' : 'text-[10px] sm:text-xs'} text-muted-foreground flex items-center justify-center`}>
        -
      </span>
    );
  }
  const color = forecast >= 100 ? 'text-emerald-600' : 'text-red-500';
  const sizeClass = large ? 'text-[11px] sm:text-sm font-medium' : 'text-[10px] sm:text-xs';

  return (
    <span className={`${sizeClass} ${color} flex items-center justify-center gap-0.5`}>
      <Activity className={large ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-3 h-3"} />
      {forecast}%
    </span>
  );
};

const DeviationIndicator = ({ value, large = false }: { value: number | null; large?: boolean }) => {
  if (value === null) {
    return (
      <span className={`${large ? 'text-[11px] sm:text-sm font-medium' : 'text-[10px] sm:text-xs'} text-muted-foreground flex items-center justify-center`}>
        -
      </span>
    );
  }
  const deviation = value - 100;

  let color = 'text-muted-foreground';
  if (deviation >= 5) color = 'text-emerald-500';
  else if (deviation <= -5) color = 'text-red-500';

  const sizeClass = large ? 'text-[11px] sm:text-sm font-medium' : 'text-[10px] sm:text-xs';

  return (
    <span className={`${sizeClass} ${color} flex items-center justify-center`}>
      {deviation >= 0 ? '+' : ''}{deviation}%
    </span>
  );
};

const MetricForecastIndicator = ({ metric, large = false }: { metric: MetricIndicator; large?: boolean }) => {
  if (metric.label === 'forecast') {
    return <ForecastIndicator forecast={metric.forecast} large={large} />;
  }
  return <DeviationIndicator value={metric.forecast} large={large} />;
};

// Skeleton для ячейки метрики
const MetricCellSkeleton = () => (
  <td className="px-2.5 sm:px-3 py-2 text-center">
    <div className="leading-tight flex justify-center">
      <div className="h-4 w-12 sm:w-14 bg-muted rounded animate-pulse" />
    </div>
    <div className="leading-tight flex justify-center mt-1">
      <div className="h-3 w-8 sm:w-10 bg-muted rounded animate-pulse" />
    </div>
  </td>
);

// Универсальная ячейка метрики
interface MetricCellProps {
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  displayMode: DisplayMode;
  isInverted: boolean;
  suffix?: string;
  isLoading?: boolean;
}

const MetricCell = ({ metric, formatValue, displayMode, isInverted, suffix = '', isLoading = false }: MetricCellProps) => {
  if (isLoading) {
    return <MetricCellSkeleton />;
  }

  const renderValue = (v: number | null, className: string) => {
    if (v === null) return <p className={`${className} text-muted-foreground tabular-nums`}>-</p>;
    return <p className={`${className} tabular-nums`}>{formatValue(v)}{suffix}</p>;
  };

  const getContent = () => {
    if (displayMode === 'fact') {
      const factValue = renderValue(metric.value, "font-medium text-[11px] sm:text-sm text-foreground");
      const percentValue = <MetricForecastIndicator metric={metric} large={false} />;
      return isInverted
        ? { primary: percentValue, secondary: factValue }
        : { primary: factValue, secondary: percentValue };
    }

    const canDiff = metric.value !== null && metric.plan !== null;
    const diff = canDiff ? (metric.value! - metric.plan!) : 0;
    const factColor = !canDiff ? 'text-muted-foreground' : (diff >= 0 ? 'text-emerald-600' : 'text-red-500');

    if (isInverted) {
      return {
        primary: metric.value === null
          ? <p className="font-medium text-[11px] sm:text-sm text-muted-foreground tabular-nums">-</p>
          : <p className={`font-medium text-[11px] sm:text-sm tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</p>,
        secondary: metric.plan === null
          ? <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">-</p>
          : <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</p>,
      };
    }

    return {
      primary: metric.plan === null
        ? <p className="font-medium text-[11px] sm:text-sm text-muted-foreground tabular-nums">-</p>
        : <p className="font-medium text-[11px] sm:text-sm text-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</p>,
      secondary: metric.value === null
        ? <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">-</p>
        : <p className={`text-[10px] sm:text-xs tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</p>,
    };
  };

  const { primary, secondary } = getContent();

  return (
    <td className="px-2.5 sm:px-3 py-2 text-center">
      <div className="leading-tight">{primary}</div>
      <div className="leading-tight">{secondary}</div>
    </td>
  );
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

interface ManagerRankingTableProps {
  period?: FilterPeriod;
  dateRange?: DateRange;
  branches?: BranchOption[];
  selectedBranches?: string[];
  onManagerClick?: (managerId: string) => void;
  isEditMode?: boolean;
  visibleColumns?: string[];
  onColumnsChange?: (codes: string[]) => void;
  availableMetrics?: Array<{ id: string; name: string; unit?: string; forecastLabel?: string; trackerCode?: string; valueType?: string }>;
  lossConfig?: import('@/lib/internalApiClient').RankingLossConfig;
  /** Per-metric forecastLabel overrides from ranking widget config */
  forecastLabelOverrides?: Record<string, 'forecast' | 'deviation'>;
  /** Custom title for the ranking table */
  title?: string;
}

type EmployeeDto = {
  name: string;
  employee_name?: string;
  designation?: string;
  department?: string;
  store_id?: string;
  image?: string;
  custom_itigris_user_id?: string;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type TrackerManagerMetric = {
  fact_value: number;
  plan_value: number;
  forecast_value: number | null;
  loss_or_overperformance: number;
};

const formatYmd = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const makeMetricFromTracker = (m: TrackerManagerMetric | undefined, label: ForecastLabel): MetricIndicator => {
  if (!m) return { value: null, plan: null, forecast: null, label };
  const value = Math.max(0, Math.round(Number(m.fact_value ?? 0)));
  const plan = Math.max(0, Math.round(Number(m.plan_value ?? 0)));

  const forecastBase =
    label === 'forecast'
      ? (m.forecast_value != null ? Number(m.forecast_value) : value)
      : value;

  let forecast = plan > 0 ? Math.round((forecastBase / plan) * 100) : (label === 'forecast' ? 0 : 100);
  if (label === 'deviation') forecast = clamp(forecast, 50, 150);
  return { value, plan, forecast, label };
};

export function ManagerRankingTable({ period = 'month', dateRange, branches, selectedBranches, onManagerClick, isEditMode, visibleColumns, onColumnsChange, availableMetrics, lossConfig: lossConfigProp, forecastLabelOverrides, title }: ManagerRankingTableProps) {
  const isMobile = useIsMobile();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fact');
  const [isInverted, setIsInverted] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  const canNavigate = Boolean(onManagerClick);
  const showBranch = Boolean(selectedBranches && selectedBranches.length > 1);

  // Effective visible metric columns
  const effectiveVisibleColumns = useMemo(() => {
    if (!visibleColumns || visibleColumns.length === 0) return DEFAULT_MANAGER_RANKING_CODES as string[];
    return visibleColumns;
  }, [visibleColumns]);

  // Build column defs from visible columns + available metrics catalog
  const columnDefs = useMemo(() => {
    return effectiveVisibleColumns
      .map(code => {
        const fromKnown = buildRankingColumnDefFromKnown(code);
        if (fromKnown) return fromKnown;
        const cat = availableMetrics?.find(m => (m.trackerCode || m.id) === code);
        if (cat) return buildRankingColumnDef(cat);
        return null;
      })
      .filter(Boolean) as RankingColumnDef[];
  }, [effectiveVisibleColumns, availableMetrics]);

  // Extra codes beyond the standard set
  const extraCodes = useMemo(() => {
    const stdSet = new Set<string>(ALL_METRIC_CODES);
    return effectiveVisibleColumns.filter(c => !stdSet.has(c));
  }, [effectiveVisibleColumns]);

  // Forecast label map for row construction
  const forecastLabelByCode = useMemo(() => {
    const map: Record<string, ForecastLabelType> = {};
    RANKING_METRIC_CONFIG.forEach(c => { map[c.code] = c.forecastLabel; });
    columnDefs.forEach(c => { map[c.code] = c.forecastLabel; });
    // Apply per-widget overrides
    if (forecastLabelOverrides) {
      for (const [code, label] of Object.entries(forecastLabelOverrides)) {
        map[code] = label;
      }
    }
    return map;
  }, [columnDefs, forecastLabelOverrides]);

  const showLostRevenue = effectiveVisibleColumns.includes(LOSS_COLUMN_CODE) || effectiveVisibleColumns.includes('revenue_created');

  // Employees loading state
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const branchList = useMemo(
    () => (branches || []).filter((b) => Boolean(b?.id)).map((b) => ({ id: String(b.id), name: String(b.name) })),
    [branches]
  );
  const branchNameById = useMemo(() => new Map(branchList.map((b) => [b.id, b.name])), [branchList]);
  const selectedStoreIds = useMemo(() => (selectedBranches || []).map(String).filter(Boolean), [selectedBranches]);

  const selectedStoreIdsKey = useMemo(() => selectedStoreIds.slice().sort().join('|'), [selectedStoreIds]);

  // Единый загрузчик метрик
  const metricsQuery = useMemo(() => ({
    storeIds: selectedStoreIds,
    dateFrom: dateRange?.from ? formatYmd(dateRange.from) : undefined,
    dateTo: dateRange?.to ? formatYmd(dateRange.to) : undefined,
    extraCodes: extraCodes.length > 0 ? extraCodes : undefined,
  }), [selectedStoreIds, dateRange?.from, dateRange?.to, extraCodes]);

  const {
    loading: metricsLoading,
    getManagersForMetric,
    getManagerMetric: getManagerMetricFromHook,
    getRankingLoss,
    rankingLossLabel,
    getLossLabelForConfig,
  } = useLeaderMetrics(metricsQuery);
  const effectiveLossLabel = lossConfigProp ? getLossLabelForConfig(lossConfigProp) : rankingLossLabel;

  // Set для отслеживания загруженных метрик
  const loadedMetrics = useMemo(() => {
    if (metricsLoading) return new Set<string>();
    return new Set([...ALL_METRIC_CODES as readonly string[], ...extraCodes]);
  }, [metricsLoading, extraCodes]);

  const loading = loadingEmployees || metricsLoading;

  // Загрузка сотрудников
  useEffect(() => {
    if (selectedStoreIds.length === 0) {
      setEmployees([]);
      return;
    }

    let cancelled = false;
    setLoadingEmployees(true);

    (async () => {
      try {
        const result = await internalApiClient.getEmployeesByStores({
          storeIds: selectedStoreIds,
          onlyManagers: true,
          limit: 500,
        });

        if (cancelled) return;
        setEmployees((result as unknown as EmployeeDto[]).filter((e) => Boolean(e?.name)));
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load employees for manager ranking', e);
          setEmployees([]);
        }
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedStoreIdsKey]);

  // Построение rawRows из employees + данных из хука
  const rawRows: Omit<ManagerRankingRow, 'rank'>[] = useMemo(() => {
    // All codes we need data for
    const allCodes = [...new Set([...ALL_METRIC_CODES, ...effectiveVisibleColumns])];

    return employees.map((e) => {
      const branchId = e?.store_id ? String(e.store_id) : undefined;
      const itigrisId = e?.custom_itigris_user_id
        ? String(e.custom_itigris_user_id).trim()
        : '';

      const getTrackerMetric = (code: string): TrackerManagerMetric | undefined => {
        const m = getManagerMetricFromHook(code, itigrisId);
        if (!m) return undefined;
        return {
          fact_value: toNumber(m.fact_value),
          plan_value: toNumber(m.plan_value),
          forecast_value: toNumberOrNull(m.forecast_value),
          loss_or_overperformance: toNumber(m.loss_or_overperformance),
        };
      };

      const metrics: Record<string, MetricIndicator> = {};
      for (const code of allCodes) {
        const label: ForecastLabel = forecastLabelByCode[code] === 'deviation' ? 'deviation' : 'forecast';
        metrics[code] = makeMetricFromTracker(getTrackerMetric(code), label);
      }

      const revenueSz = metrics['revenue_created'];
      const planPercentValue = (revenueSz.value !== null && revenueSz.plan !== null && revenueSz.plan > 0)
        ? Math.round((revenueSz.value / revenueSz.plan) * 100)
        : null;

      const lostRevenue = getRankingLoss(itigrisId, 'manager', lossConfigProp);

      return {
        id: String(e.name),
        name: String(e.employee_name || e.name),
        role: String(e.designation || ''),
        branchId,
        branchName: branchId ? branchNameById.get(String(branchId)) : undefined,
        avatar: internalApiClient.getEmployeeImageUrl(String(e.name)),
        planPercent: planPercentValue,
        lostRevenue,
        metrics,
      };
    });
  }, [employees, getManagersForMetric, getManagerMetricFromHook, branchNameById, forecastLabelByCode, effectiveVisibleColumns]);

  const rows: ManagerRankingRow[] = useMemo(() => {
    const base = [...rawRows];

    const cmpNullableNumber = (aVal: number | null, bVal: number | null, direction: SortDirection) => {
      const aMissing = aVal === null || !Number.isFinite(aVal);
      const bMissing = bVal === null || !Number.isFinite(bVal);
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return direction === 'desc' ? (bVal! - aVal!) : (aVal! - bVal!);
    };

    base.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number | null, bVal: number | null;

      if (field === 'planPercent') {
        aVal = a.planPercent;
        bVal = b.planPercent;
      } else if (field === 'lostRevenue') {
        aVal = a.lostRevenue;
        bVal = b.lostRevenue;
      } else {
        // Metric code sort
        const metricA = a.metrics[field];
        const metricB = b.metrics[field];
        if (!metricA && !metricB) return 0;
        if (!metricA) return 1;
        if (!metricB) return -1;
        if (displayMode === 'plan') {
          aVal = isInverted ? metricA.value : metricA.plan;
          bVal = isInverted ? metricB.value : metricB.plan;
        } else {
          aVal = isInverted ? metricA.forecast : metricA.value;
          bVal = isInverted ? metricB.forecast : metricB.value;
        }
      }

      return cmpNullableNumber(aVal, bVal, direction);
    });

    return base.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  }, [rawRows, sortConfig, displayMode, isInverted]);

  if (isMobile) {
    return (
      <ManagerRankingMobile
        rows={rows}
        displayMode={displayMode}
        isInverted={isInverted}
        onDisplayModeChange={setDisplayMode}
        onInvertedChange={setIsInverted}
        onManagerClick={onManagerClick}
        sortConfig={sortConfig}
        onSort={handleSort}
        showBranch={Boolean(selectedBranches && selectedBranches.length > 1)}
        loadedMetrics={loadedMetrics}
        columnDefs={columnDefs}
        visibleColumns={effectiveVisibleColumns}
        isEditMode={isEditMode}
        onColumnsChange={onColumnsChange}
        availableMetrics={availableMetrics}
        title={title}
      />
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden relative isolate">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-muted/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">{title || 'Рейтинг менеджеров'}</h3>
          {loading && <span className="text-xs text-muted-foreground">загрузка…</span>}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-background border border-border/60 p-0.5">
          <button
            type="button"
            onClick={() => setDisplayMode('fact')}
            className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
              displayMode === 'fact' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Прогноз
          </button>
          <button
            type="button"
            onClick={() => setIsInverted(!isInverted)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Инверсия"
            title="Инверсия"
          >
            <ArrowUpDown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('plan')}
            className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
              displayMode === 'plan' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            План
          </button>
        </div>
      </div>

      {isEditMode && onColumnsChange && (
        <RankingColumnsEditor
          type="manager"
          visibleColumns={effectiveVisibleColumns}
          onChange={onColumnsChange}
          availableMetrics={availableMetrics}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] sm:text-sm min-w-[860px] sm:min-w-[900px]">
          <thead>
            <tr className="bg-muted border-b">
              <th className="sticky left-0 z-10 bg-muted px-2 py-2 text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap w-[155px] min-w-[155px] sm:w-[170px] sm:min-w-[170px] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                Сотрудник
              </th>
              <SortableHeader
                field="planPercent"
                label="% плана"
                currentSort={sortConfig}
                onSort={handleSort}
                className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap w-[62px] sm:w-[70px]"
              />
              {columnDefs.map(col => (
                <SortableHeader
                  key={col.code}
                  field={col.code}
                  label={col.label}
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className={`px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap ${col.width}`}
                />
              ))}
              {showLostRevenue && (
                <SortableHeader
                  field="lostRevenue"
                  label="Потери"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px] sm:w-[110px]"
                />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                {...(onManagerClick ? { onClick: () => onManagerClick(row.id) } : {})}
                className={`border-b last:border-b-0 transition-colors ${
                  canNavigate ? 'hover:bg-primary/5 cursor-pointer' : ''
                } ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/40'
                }`}
              >
              {/* Combined: Rank + Employee */}
              <td className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                index % 2 === 0 ? 'bg-background' : 'bg-muted'
              }`}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground w-4.5 sm:w-5 text-center flex-shrink-0">{row.rank}</span>
                  <Avatar className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0">
                    <AvatarImage src={row.avatar} alt={row.name} />
                    <AvatarFallback className="text-[10px] sm:text-xs bg-primary/10 text-primary">
                      {getInitials(row.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{row.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{row.role}</p>
                    {showBranch && row.branchName && (
                      <p className="text-[10px] text-primary/70 truncate font-medium">{row.branchName}</p>
                    )}
                  </div>
                </div>
              </td>

                {/* Plan percent */}
              <td className="px-2.5 sm:px-3 py-2 text-center">
                {!loadedMetrics.has('revenue_created') ? (
                  <div className="h-4 w-10 bg-muted rounded animate-pulse mx-auto" />
                ) : (
                  <span className={`text-xs sm:text-sm font-bold ${getPercentColor(row.planPercent)}`}>
                    {row.planPercent === null ? '-' : `${row.planPercent}%`}
                  </span>
                )}
                </td>

                {/* Dynamic metric columns */}
                {columnDefs.map(col => {
                  const metric = row.metrics[col.code];
                  if (!metric) return <MetricCellSkeleton key={col.code} />;
                  return (
                    <MetricCell
                      key={col.code}
                      metric={metric}
                      formatValue={(v) => col.formatValue(v)}
                      displayMode={displayMode}
                      isInverted={isInverted}
                      suffix={col.suffix}
                      isLoading={!loadedMetrics.has(col.code)}
                    />
                  );
                })}

                {/* Lost revenue / reserve */}
                {showLostRevenue && (() => {
                  if (!loadedMetrics.has('revenue_created')) {
                    return (
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="h-4 w-14 bg-muted rounded animate-pulse mx-auto" />
                      </td>
                    );
                  }
                  const v = row.lostRevenue;
                  if (v === null) {
                    return (
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span className="text-sm font-medium text-muted-foreground">-</span>
                      </td>
                    );
                  }
                  const isLoss = v < 0;
                  return (
                    <td className={`px-3 py-2.5 text-center whitespace-nowrap ${isLoss ? 'bg-red-50/80 dark:bg-red-900/20' : 'bg-emerald-50/80 dark:bg-emerald-900/20'}`}>
                      <span className={`text-sm font-medium ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isLoss ? `-${formatNumber(Math.abs(v))}` : formatNumber(v)}
                      </span>
                    </td>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
