import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { RankingColumnDef } from '@/hooks/useLeaderMetrics';

type ForecastLabel = 'forecast' | 'deviation';

export type DisplayMode = 'fact' | 'plan';

interface MetricIndicator {
  value: number | null;
  plan: number | null;
  forecast: number | null;
  label: ForecastLabel;
}

export interface ManagerRankingRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  branchId?: string;
  branchName?: string;
  avatar?: string;
  planPercent: number | null;
  lostRevenue: number | null;
  metrics: Record<string, MetricIndicator>;
}

interface ManagerRankingCardProps {
  manager: ManagerRankingRow;
  displayMode: DisplayMode;
  isInverted: boolean;
  highlightedField?: string;
  showBranch?: boolean;
  onClick?: () => void;
  loadedMetrics?: Set<string>;
  columnDefs: RankingColumnDef[];
}

const formatNumber = (value: number | null): string => {
  if (value === null) return '-';
  return Math.round(value).toLocaleString('ru-RU');
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

const getPercentColor = (percent: number | null): string => {
  if (percent === null) return 'text-muted-foreground';
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressColor = (percent: number | null): string => {
  if (percent === null) return 'bg-muted';
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const getIndicatorColor = (forecast: number | null, label: ForecastLabel): string => {
  if (forecast === null) return 'text-muted-foreground';
  if (label === 'forecast') {
    return forecast >= 100 ? 'text-emerald-600' : 'text-red-500';
  }
  const deviation = forecast - 100;
  if (deviation >= 5) return 'text-emerald-600';
  if (deviation <= -5) return 'text-red-500';
  return 'text-muted-foreground';
};

const formatIndicator = (forecast: number | null, label: ForecastLabel): string => {
  if (forecast === null) return '-';
  if (label === 'forecast') return `${forecast}%`;
  const deviation = forecast - 100;
  return `${deviation >= 0 ? '+' : ''}${deviation}%`;
};

// Skeleton для метрики в карточке
const CompactMetricSkeleton = ({ label, isHighlighted }: { label: string; isHighlighted?: boolean }) => (
  <div className={`p-1.5 sm:p-1.5 max-[360px]:p-1 rounded transition-all ${
    isHighlighted
      ? 'bg-primary/10 ring-1 ring-primary/40'
      : 'bg-muted/30'
  }`}>
    <span className="text-[9px] sm:text-[9px] max-[360px]:text-[8px] text-muted-foreground block truncate leading-tight">{label}</span>
    <div className="flex flex-col gap-0.5 text-[11px] sm:text-[11px] max-[360px]:text-[10px] leading-tight">
      <div className="h-3 w-10 bg-muted rounded animate-pulse" />
      <div className="h-2.5 w-8 bg-muted rounded animate-pulse" />
    </div>
  </div>
);

interface CompactMetricProps {
  label: string;
  metric: MetricIndicator;
  formatValue: (value: number | null) => string;
  suffix?: string;
  displayMode: DisplayMode;
  isInverted: boolean;
  isHighlighted?: boolean;
  isLoading?: boolean;
}

const CompactMetric = ({ label, metric, formatValue, suffix = '', displayMode, isInverted, isHighlighted, isLoading }: CompactMetricProps) => {
  if (isLoading) {
    return <CompactMetricSkeleton label={label} isHighlighted={isHighlighted} />;
  }
  const getValues = () => {
    if (displayMode === 'fact') {
      const factValue = (
        <span className={`font-semibold tabular-nums ${metric.value === null ? 'text-muted-foreground' : 'text-foreground'}`}>
          {formatValue(metric.value)}{metric.value === null ? '' : suffix}
        </span>
      );
      const percentValue = (
        <span className={`tabular-nums ${getIndicatorColor(metric.forecast, metric.label)}`}>
          {formatIndicator(metric.forecast, metric.label)}
        </span>
      );

      return isInverted
        ? { primary: percentValue, secondary: factValue }
        : { primary: factValue, secondary: percentValue };
    }

    // plan mode: plan vs fact (fact colored)
    const canDiff = metric.value !== null && metric.plan !== null;
    const diff = canDiff ? (metric.value! - metric.plan!) : 0;
    const factColor = !canDiff ? 'text-muted-foreground' : (diff >= 0 ? 'text-emerald-600' : 'text-red-500');

    if (isInverted) {
      return {
        primary: (
          <span className={`font-semibold tabular-nums ${factColor}`}>
            {formatValue(metric.value)}{metric.value === null ? '' : suffix}
          </span>
        ),
        secondary: (
          <span className={`tabular-nums ${metric.plan === null ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {formatValue(metric.plan)}{metric.plan === null ? '' : suffix}
          </span>
        ),
      };
    }

    return {
      primary: (
        <span className={`font-semibold tabular-nums ${metric.plan === null ? 'text-muted-foreground' : 'text-foreground'}`}>
          {formatValue(metric.plan)}{metric.plan === null ? '' : suffix}
        </span>
      ),
      secondary: (
        <span className={`tabular-nums ${factColor}`}>
          {formatValue(metric.value)}{metric.value === null ? '' : suffix}
        </span>
      ),
    };
  };

  const { primary, secondary } = getValues();

  return (
  <div className={`p-1.5 sm:p-1.5 max-[360px]:p-1 rounded transition-all ${
    isHighlighted
      ? 'bg-primary/10 ring-1 ring-primary/40'
      : 'bg-muted/30'
  }`}>
    <span className="text-[9px] sm:text-[9px] max-[360px]:text-[8px] text-muted-foreground block truncate leading-tight">{label}</span>
    <div className="flex flex-col gap-0.5 text-[11px] sm:text-[11px] max-[360px]:text-[10px] leading-tight">
      <div className="leading-tight">{primary}</div>
      <div className="text-[10px] sm:text-[10px] max-[360px]:text-[9px] leading-tight">{secondary}</div>
    </div>
  </div>
);
};

interface LostRevenueCellProps {
  value: number | null;
  isHighlighted: boolean;
  isLoading?: boolean;
}

const LostRevenueCell = ({ value, isHighlighted, isLoading }: LostRevenueCellProps) => {
  const hasValue = typeof value === 'number' && Number.isFinite(value) && value !== 0;
  const isLoss = hasValue && value < 0;
  const isReserve = hasValue && value > 0;

  const label = isReserve ? 'Запас' : 'Потери';
  const displayValue = hasValue ? Math.abs(value) : null;
  const valueText = displayValue === null ? '-' : formatNumber(displayValue);

  const bgColor = isHighlighted
    ? 'bg-primary/10 ring-1 ring-primary/40'
    : isReserve
      ? 'bg-emerald-50/80 dark:bg-emerald-900/20'
      : 'bg-red-50/80 dark:bg-red-900/20';

  const valueColor = !hasValue
    ? 'text-muted-foreground'
    : isReserve
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  if (isLoading) {
    return (
      <div className={`p-1.5 max-[360px]:p-1 rounded transition-all ${bgColor}`}>
        <span className="text-[9px] sm:text-[9px] max-[360px]:text-[8px] text-muted-foreground block truncate leading-tight">
          {label}
        </span>
        <div className="h-3 w-10 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`p-1.5 max-[360px]:p-1 rounded transition-all ${bgColor}`}>
      <span className="text-[9px] sm:text-[9px] max-[360px]:text-[8px] text-muted-foreground block truncate leading-tight">
        {label}
      </span>
      <span className={`text-[11px] sm:text-[11px] max-[360px]:text-[10px] font-medium ${valueColor} leading-tight`}>
        {valueText}
      </span>
    </div>
  );
};

export function ManagerRankingCard({ manager, displayMode, isInverted, highlightedField, showBranch, onClick, loadedMetrics, columnDefs }: ManagerRankingCardProps) {
  const isClickable = Boolean(onClick);
  const isMetricLoading = (code: string) => !loadedMetrics || !loadedMetrics.has(code);
  const showLostRevenue = columnDefs.some(c => c.code === 'revenue_created');

  return (
    <div
      {...(onClick ? { onClick } : {})}
      className={`bg-card rounded-xl border border-border/80 shadow-md p-1.5 sm:p-2 max-[360px]:p-1 transition-colors ${
        isClickable ? 'cursor-pointer hover:bg-primary/5 active:scale-[0.99]' : ''
      }`}
    >
      {/* Header: Rank + Avatar + Name + Progress */}
      <div className="flex items-center gap-1.5 sm:gap-2 max-[360px]:gap-1 mb-1.5 sm:mb-2 max-[360px]:mb-1">
        <span className={`text-sm sm:text-base max-[360px]:text-xs font-bold w-4.5 sm:w-5 max-[360px]:w-4 text-center ${getPercentColor(manager.planPercent)}`}>
          {manager.rank}
        </span>
        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 max-[360px]:w-6 max-[360px]:h-6 flex-shrink-0">
          <AvatarImage src={manager.avatar} alt={manager.name} />
          <AvatarFallback className="text-[10px] sm:text-xs max-[360px]:text-[9px] bg-primary/10 text-primary">
            {getInitials(manager.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 flex flex-col gap-0">
          <p className="text-sm sm:text-sm max-[360px]:text-xs font-medium text-foreground truncate leading-tight">{manager.name}</p>
          {showBranch && manager.branchName && (
            <p className="text-[10px] sm:text-xs max-[360px]:text-[9px] text-muted-foreground truncate leading-none mt-0.5">{manager.branchName}</p>
          )}
          <p className="text-[10px] sm:text-xs max-[360px]:text-[9px] text-muted-foreground/70 truncate leading-none mt-0.5">{manager.role}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 max-[360px]:gap-1 min-w-[60px] sm:min-w-[70px] max-[360px]:min-w-[54px]">
          {isMetricLoading('revenue_created') ? (
            <>
              <div className="w-8 sm:w-10 max-[360px]:w-7 h-1.5 bg-muted rounded-full animate-pulse" />
              <div className="w-8 h-4 bg-muted rounded animate-pulse" />
            </>
          ) : (
            <>
              <div className="w-8 sm:w-10 max-[360px]:w-7 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(manager.planPercent)}`}
                  style={{ width: `${manager.planPercent === null ? 0 : Math.min(manager.planPercent, 100)}%` }}
                />
              </div>
              <span className={`text-xs sm:text-sm max-[360px]:text-[10px] font-bold ${getPercentColor(manager.planPercent)}`}>
                {manager.planPercent === null ? '-' : `${manager.planPercent}%`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid - dynamic columns */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-1.5 max-[360px]:gap-1">
        {columnDefs.map(col => {
          const metric = manager.metrics[col.code];
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

        {/* Lost Revenue / Reserve */}
        {showLostRevenue && (
          <LostRevenueCell
            value={manager.lostRevenue}
            isHighlighted={highlightedField === 'lostRevenue'}
            isLoading={isMetricLoading('revenue_created')}
          />
        )}
      </div>
    </div>
  );
}
