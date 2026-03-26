import { useMemo, useState } from "react";
import { Activity, ArrowUpDown, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useLeaderMetrics,
  toNumber,
  ALL_METRIC_CODES,
  DEFAULT_BRANCH_RANKING_CODES,
  RANKING_METRIC_CONFIG,
  LOSS_COLUMN_CODE,
  buildRankingColumnDef,
  buildRankingColumnDefFromKnown,
  type RankingColumnDef,
  type ForecastLabelType,
} from "@/hooks/useLeaderMetrics";

import type { BranchOption } from "./BranchSelector";
import { BranchRankingMobile } from "./BranchRankingMobile";
import type { BranchRankingRow, DisplayMode, MetricIndicator } from "./BranchRankingCard";
import { RankingColumnsEditor } from "./RankingColumnsEditor";

type SortDirection = "asc" | "desc";

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

const SortableHeader = ({ field, label, currentSort, onSort, className = "" }: SortableHeaderProps) => {
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
          currentSort.direction === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </div>
    </th>
  );
};

type ForecastLabel = "forecast" | "deviation";

const ForecastIndicator = ({ forecast }: { forecast: number }) => {
  const color = forecast >= 100 ? "text-emerald-600" : "text-red-500";
  return (
    <span className={`${color} flex items-center justify-center gap-0.5`}>
      <Activity className="w-3 h-3" />
      {forecast}%
    </span>
  );
};

const DeviationIndicator = ({ value }: { value: number }) => {
  const deviation = value - 100;
  let color = "text-muted-foreground";
  if (deviation >= 5) color = "text-emerald-500";
  else if (deviation <= -5) color = "text-red-500";
  return <span className={`${color} flex items-center justify-center`}>{deviation >= 0 ? "+" : ""}{deviation}%</span>;
};

const MetricForecastIndicator = ({ metric }: { metric: MetricIndicator }) => {
  if (metric.label === "forecast") return <ForecastIndicator forecast={metric.forecast} />;
  return <DeviationIndicator value={metric.forecast} />;
};

// Skeleton для ячейки метрики
const MetricCellSkeleton = () => (
  <td className="px-3 py-2.5 text-center">
    <div className="text-sm leading-tight flex justify-center">
      <div className="h-4 w-12 sm:w-14 bg-muted rounded animate-pulse" />
    </div>
    <div className="text-[11px] leading-tight flex justify-center mt-1">
      <div className="h-3 w-8 sm:w-10 bg-muted rounded animate-pulse" />
    </div>
  </td>
);

interface MetricCellProps {
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  displayMode: DisplayMode;
  isInverted: boolean;
  suffix?: string;
  isLoading?: boolean;
}

const MetricCell = ({ metric, formatValue, displayMode, isInverted, suffix = "", isLoading = false }: MetricCellProps) => {
  if (isLoading) {
    return <MetricCellSkeleton />;
  }

  const getContent = () => {
    if (displayMode === "fact") {
      const factValue = (
        <span className="font-medium text-foreground tabular-nums">
          {formatValue(metric.value)}{suffix}
        </span>
      );
      const percentValue = <MetricForecastIndicator metric={metric} />;
      return isInverted ? { primary: percentValue, secondary: factValue } : { primary: factValue, secondary: percentValue };
    }

    const diff = metric.value - metric.plan;
    const factColor = diff >= 0 ? "text-emerald-600" : "text-red-500";
    if (isInverted) {
      return {
        primary: <span className={`font-medium tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</span>,
        secondary: <span className="text-muted-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</span>,
      };
    }
    return {
      primary: <span className="font-medium text-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</span>,
      secondary: <span className={`tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</span>,
    };
  };

  const { primary, secondary } = getContent();

  return (
    <td className="px-3 py-2.5 text-center">
      <div className="text-sm leading-tight">{primary}</div>
      <div className="text-[11px] leading-tight">{secondary}</div>
    </td>
  );
};

const formatNumber = (value: number) => Math.round(value).toLocaleString("ru-RU");

export interface BranchRankingTableProps {
  branches: BranchOption[];
  selectedBranchIds: string[];
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  onBranchClick?: (branchId: string) => void;
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

const makeZeroIndicator = (label: ForecastLabel): MetricIndicator => ({ value: 0, plan: 0, forecast: 0, label });

export function BranchRankingTable({
  branches,
  selectedBranchIds,
  departmentId,
  dateFrom,
  dateTo,
  onBranchClick,
  isEditMode,
  visibleColumns,
  onColumnsChange,
  availableMetrics,
  lossConfig: lossConfigProp,
  forecastLabelOverrides,
  title,
}: BranchRankingTableProps) {
  const isMobile = useIsMobile();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("fact");
  const [isInverted, setIsInverted] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "planPercent", direction: "desc" });

  // Effective visible metric columns (all if not configured)
  const effectiveVisibleColumns = useMemo(() => {
    if (!visibleColumns || visibleColumns.length === 0) return DEFAULT_BRANCH_RANKING_CODES as string[];
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

  // Extra codes beyond the standard set (for useLeaderMetrics)
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

  const showLostRevenue = effectiveVisibleColumns.includes(LOSS_COLUMN_CODE) || effectiveVisibleColumns.includes("revenue_created");

  const branchById = useMemo(() => new Map(branches.map((b) => [String(b.id), b])), [branches]);
  const effectiveSelected = useMemo(() => {
    const allowed = new Set(branches.map((b) => String(b.id)));
    const normalized = Array.from(new Set(selectedBranchIds.map(String))).filter((id) => allowed.has(id));
    return normalized.length > 0 ? normalized : branches.map((b) => String(b.id));
  }, [selectedBranchIds, branches]);

  // Единый загрузчик метрик
  const metricsQuery = useMemo(() => ({
    storeIds: effectiveSelected,
    dateFrom,
    dateTo,
    extraCodes: extraCodes.length > 0 ? extraCodes : undefined,
  }), [effectiveSelected, dateFrom, dateTo, extraCodes]);

  const { loading, getStoreMetric, getRankingLoss, rankingLossLabel, getLossLabelForConfig } = useLeaderMetrics(metricsQuery);
  const effectiveLossLabel = lossConfigProp ? getLossLabelForConfig(lossConfigProp) : rankingLossLabel;

  const handleSort = (field: string) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // Построение rawRows
  const rawRows: Omit<BranchRankingRow, "rank">[] = useMemo(() => {
    const allCodes = [...new Set([...ALL_METRIC_CODES, ...effectiveVisibleColumns])];

    return effectiveSelected.map((storeId) => {
      const meta = branchById.get(storeId);

      const getIndicator = (code: string): MetricIndicator => {
        const label: ForecastLabel = forecastLabelByCode[code] === "deviation" ? "deviation" : "forecast";
        const data = getStoreMetric(code, storeId);
        if (!data) return makeZeroIndicator(label);

        const value = toNumber(data.fact_value);
        const plan = toNumber(data.plan_value);
        const forecastVal = toNumber(data.forecast_value);

        let forecast = 0;
        if (label === "deviation") {
          // Use fact/plan ratio — loss_or_overperformance may be in absolute units (₽), not %
          forecast = plan > 0 ? Math.round((value / plan) * 100) : 100;
        } else {
          forecast = plan > 0 ? Math.round((forecastVal / plan) * 100) : 0;
        }

        return { value, plan, forecast, label };
      };

      const metrics: Record<string, MetricIndicator> = {};
      for (const code of allCodes) {
        metrics[code] = getIndicator(code);
      }

      const revenueCreated = metrics["revenue_created"];
      const planPercent = revenueCreated.plan > 0
        ? Math.round((revenueCreated.value / revenueCreated.plan) * 100)
        : 0;

      const lostRevenue = getRankingLoss(storeId, 'store', lossConfigProp);

      return {
        id: storeId,
        name: meta?.name ?? storeId,
        planPercent,
        lostRevenue,
        metrics,
      };
    });
  }, [effectiveSelected, branchById, getStoreMetric, forecastLabelByCode, effectiveVisibleColumns]);

  const rows: BranchRankingRow[] = useMemo(() => {
    const built = [...rawRows];
    built.sort((a, b) => {
      const { field, direction } = sortConfig;

      if (field === "name") {
        const res = a.name.localeCompare(b.name, "ru");
        return direction === "desc" ? -res : res;
      }

      let aVal: number, bVal: number;

      if (field === "planPercent") {
        aVal = a.planPercent;
        bVal = b.planPercent;
      } else if (field === "lostRevenue") {
        aVal = a.lostRevenue;
        bVal = b.lostRevenue;
      } else {
        // Metric code sort
        const ma = a.metrics[field];
        const mb = b.metrics[field];
        if (!ma && !mb) return 0;
        if (!ma) return 1;
        if (!mb) return -1;
        if (displayMode === "plan") {
          aVal = isInverted ? ma.value : ma.plan;
          bVal = isInverted ? mb.value : mb.plan;
        } else {
          aVal = isInverted ? ma.forecast : ma.value;
          bVal = isInverted ? mb.forecast : mb.value;
        }
      }

      return direction === "desc" ? bVal - aVal : aVal - bVal;
    });
    return built.map((row, idx) => ({ ...row, rank: idx + 1 }));
  }, [rawRows, sortConfig, displayMode, isInverted]);

  // Loaded metrics set for cards
  const loadedMetrics = useMemo(() => {
    if (loading) return undefined;
    return new Set([...ALL_METRIC_CODES as readonly string[], ...extraCodes]);
  }, [loading, extraCodes]);

  if (isMobile) {
    return (
      <BranchRankingMobile
        rows={rows}
        displayMode={displayMode}
        isInverted={isInverted}
        onDisplayModeChange={setDisplayMode}
        onInvertedChange={setIsInverted}
        onBranchClick={onBranchClick}
        sortConfig={sortConfig}
        onSort={handleSort}
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
          <h3 className="text-sm sm:text-base font-semibold text-foreground">{title || 'Рейтинг филиалов'}</h3>
          {loading && <span className="text-xs text-muted-foreground">загрузка…</span>}
        </div>

        <div className="flex items-center gap-1 rounded-full bg-background border border-border/60 p-0.5">
          <button
            type="button"
            onClick={() => setDisplayMode("fact")}
            className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
              displayMode === "fact" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Прогноз
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsInverted(!isInverted)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Инверсия"
            title="Инверсия"
          >
            <ArrowUpDown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setDisplayMode("plan")}
            className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
              displayMode === "plan" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            План
          </button>
        </div>
      </div>

      {isEditMode && onColumnsChange && (
        <RankingColumnsEditor
          type="branch"
          visibleColumns={effectiveVisibleColumns}
          onChange={onColumnsChange}
          availableMetrics={availableMetrics}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] sm:text-sm min-w-[980px]">
          <thead>
            <tr className="bg-muted border-b">
              <SortableHeader
                field="name"
                label="Филиал"
                currentSort={sortConfig}
                onSort={handleSort}
                className="sticky left-0 z-10 bg-muted px-2 py-2 text-[11px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap w-[190px] min-w-[190px] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] text-left"
              />
              <SortableHeader field="planPercent" label="% плана" currentSort={sortConfig} onSort={handleSort} className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]" />
              {columnDefs.map(col => (
                <SortableHeader
                  key={col.code}
                  field={col.code}
                  label={col.label}
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className={`px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap ${col.width}`}
                />
              ))}
              {showLostRevenue && (
                <SortableHeader field="lostRevenue" label="Потери/запас" currentSort={sortConfig} onSort={handleSort} className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[110px]" />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                {...(onBranchClick ? { onClick: () => onBranchClick(row.id) } : {})}
                className={`border-b last:border-b-0 transition-colors ${onBranchClick ? "hover:bg-primary/5 cursor-pointer" : ""} ${
                  index % 2 === 0 ? "bg-background" : "bg-muted/40"
                }`}
              >
                <td
                  className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                    index % 2 === 0 ? "bg-background" : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground w-4.5 sm:w-5 text-center flex-shrink-0">{row.rank}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">{row.name}</p>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-2.5 text-center">
                  {loading ? (
                    <div className="h-4 w-10 bg-muted rounded animate-pulse mx-auto" />
                  ) : (
                    <span className={`text-sm font-bold ${row.planPercent >= 100 ? "text-emerald-600" : row.planPercent >= 80 ? "text-amber-500" : "text-red-500"}`}>
                      {row.planPercent}%
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
                      isLoading={loading}
                    />
                  );
                })}

                {showLostRevenue && (
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {loading ? (
                      <div className="h-4 w-14 bg-muted rounded animate-pulse mx-auto" />
                    ) : (
                      <span className={`text-sm font-medium ${row.lostRevenue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {row.lostRevenue > 0 ? "+" : ""}{formatNumber(row.lostRevenue)}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
