import type { RankingColumnDef } from '@/hooks/useLeaderMetrics';

export type ForecastLabel = "forecast" | "deviation";
export type DisplayMode = "fact" | "plan";

export interface MetricIndicator {
  value: number;
  plan: number;
  forecast: number;
  label: ForecastLabel;
}

export interface BranchRankingRow {
  id: string;
  rank: number;
  name: string;
  planPercent: number;
  lostRevenue: number;
  metrics: Record<string, MetricIndicator>;
}

interface BranchRankingCardProps {
  branch: BranchRankingRow;
  displayMode: DisplayMode;
  isInverted: boolean;
  highlightedField?: string;
  onClick?: () => void;
  loadedMetrics?: Set<string>;
  columnDefs: RankingColumnDef[];
}

const formatNumber = (value: number): string => Math.round(value).toLocaleString("ru-RU");

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return "text-emerald-600";
  if (percent >= 80) return "text-amber-500";
  return "text-red-500";
};

const getProgressColor = (percent: number): string => {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 80) return "bg-amber-500";
  return "bg-red-500";
};

const getIndicatorColor = (forecast: number, label: ForecastLabel): string => {
  if (label === "forecast") return forecast >= 100 ? "text-emerald-600" : "text-red-500";
  const deviation = forecast - 100;
  if (deviation >= 5) return "text-emerald-600";
  if (deviation <= -5) return "text-red-500";
  return "text-muted-foreground";
};

const formatIndicator = (forecast: number, label: ForecastLabel): string => {
  if (label === "forecast") return `${forecast}%`;
  const deviation = forecast - 100;
  return `${deviation >= 0 ? "+" : ""}${deviation}%`;
};

// Skeleton для метрики в карточке
const CompactMetricSkeleton = ({ label, isHighlighted }: { label: string; isHighlighted?: boolean }) => (
  <div className={`text-center p-1.5 rounded-md min-h-[56px] min-w-0 flex flex-col justify-center transition-all ${
    isHighlighted ? "bg-primary/10 ring-1 ring-primary/40" : "bg-muted/30"
  }`}>
    <div className="text-[9px] text-muted-foreground mb-0.5 leading-tight break-words">{label}</div>
    <div className="h-3 w-10 bg-muted rounded animate-pulse mx-auto" />
    <div className="h-2.5 w-8 bg-muted rounded animate-pulse mx-auto mt-1" />
  </div>
);

interface CompactMetricProps {
  label: string;
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  suffix?: string;
  displayMode: DisplayMode;
  isInverted: boolean;
  isHighlighted?: boolean;
  isLoading?: boolean;
}

const CompactMetric = ({ label, metric, formatValue, suffix = "", displayMode, isInverted, isHighlighted, isLoading }: CompactMetricProps) => {
  if (isLoading) {
    return <CompactMetricSkeleton label={label} isHighlighted={isHighlighted} />;
  }
  const getValues = () => {
    if (displayMode === "fact") {
      const factValue = <span className="font-semibold text-foreground tabular-nums">{formatValue(metric.value)}{suffix}</span>;
      const percentValue = (
        <span className={`tabular-nums ${getIndicatorColor(metric.forecast, metric.label)}`}>
          {formatIndicator(metric.forecast, metric.label)}
        </span>
      );
      return isInverted ? { primary: percentValue, secondary: factValue } : { primary: factValue, secondary: percentValue };
    }

    const diff = metric.value - metric.plan;
    const factColor = diff >= 0 ? "text-emerald-600" : "text-red-500";
    if (isInverted) {
      return {
        primary: <span className={`font-semibold tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</span>,
        secondary: <span className="text-muted-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</span>,
      };
    }
    return {
      primary: <span className="font-semibold text-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</span>,
      secondary: <span className={`tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</span>,
    };
  };

  const { primary, secondary } = getValues();

  return (
    <div className={`text-center p-1.5 rounded-md min-h-[56px] min-w-0 flex flex-col justify-center transition-all ${
      isHighlighted ? "bg-primary/10 ring-1 ring-primary/40" : "bg-muted/30"
    }`}>
      <div className="text-[9px] text-muted-foreground mb-0.5 leading-tight break-words">{label}</div>
      <div className="text-xs font-medium leading-tight">{primary}</div>
      <div className="text-[9px] leading-tight">{secondary}</div>
    </div>
  );
};

export function BranchRankingCard({ branch, displayMode, isInverted, highlightedField, onClick, loadedMetrics, columnDefs }: BranchRankingCardProps) {
  const isClickable = Boolean(onClick);
  const isMetricLoading = (code: string) => !loadedMetrics || !loadedMetrics.has(code);
  const showLostRevenue = columnDefs.some(c => c.code === 'revenue_created');

  return (
    <div
      {...(onClick ? { onClick } : {})}
      className={`bg-card rounded-xl border border-border/80 shadow-md p-2 transition-colors ${
        isClickable ? "cursor-pointer hover:bg-primary/5 active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-base font-bold w-5 text-center ${getPercentColor(branch.planPercent)}`}>{branch.rank}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{branch.name}</p>
        </div>
        <div className="flex items-center gap-2 min-w-[70px]">
          {isMetricLoading("revenue_created") ? (
            <>
              <div className="w-10 h-1.5 bg-muted rounded-full animate-pulse" />
              <div className="w-8 h-4 bg-muted rounded animate-pulse" />
            </>
          ) : (
            <>
              <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(branch.planPercent)}`}
                  style={{ width: `${Math.min(branch.planPercent, 100)}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${getPercentColor(branch.planPercent)}`}>{branch.planPercent}%</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {columnDefs.map(col => {
          const metric = branch.metrics[col.code];
          if (!metric) return <CompactMetricSkeleton key={col.code} label={col.label} isHighlighted={highlightedField === col.code} />;
          return (
            <CompactMetric
              key={col.code}
              label={col.label}
              metric={metric}
              formatValue={(v) => col.formatValue(v)}
              suffix={col.suffix}
              displayMode={displayMode}
              isInverted={isInverted}
              isHighlighted={highlightedField === col.code}
              isLoading={isMetricLoading(col.code)}
            />
          );
        })}

        {showLostRevenue && (() => {
          if (isMetricLoading("revenue_created")) {
            return (
              <div className={`p-1.5 rounded transition-all ${highlightedField === "lostRevenue" ? "bg-primary/10 ring-1 ring-primary/40" : "bg-red-50/80 dark:bg-red-900/20"}`}>
                <span className="text-[9px] text-muted-foreground block truncate leading-tight">Потери</span>
                <div className="h-3 w-10 bg-muted rounded animate-pulse" />
              </div>
            );
          }
          const isPositive = branch.lostRevenue >= 0;
          const label = isPositive ? "Запас" : "Потери";
          const bgColor = isPositive ? "bg-emerald-50/80 dark:bg-emerald-900/20" : "bg-red-50/80 dark:bg-red-900/20";
          const textColor = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
          return (
            <div className={`p-1.5 rounded transition-all ${highlightedField === "lostRevenue" ? "bg-primary/10 ring-1 ring-primary/40" : bgColor}`}>
              <span className="text-[9px] text-muted-foreground block truncate leading-tight">{label}</span>
              <span className={`text-[11px] font-medium ${textColor} leading-tight`}>{branch.lostRevenue > 0 ? "+" : ""}{formatNumber(branch.lostRevenue)}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
