import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';
import { FullWidthKPIMetric } from './KPIFullWidthCard';
import { MetricProgressBar } from './MetricProgressBar';
import { formatFull, formatReserveFull, calculateMetricStatus } from '@/lib/formatters';

// Status-based styling — subtle, modern
const getStatusStyles = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'critical':
      return 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    case 'good':
      return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800';
    default:
      return 'bg-card border-border';
  }
};

interface KPICompactCardProps {
  metric: FullWidthKPIMetric;
  onClick?: () => void;
}

export function KPICompactCard({ metric, onClick }: KPICompactCardProps) {
  // Skeleton state
  if (metric.isLoading) {
    return (
      <div className="w-full h-full border rounded-xl p-2 bg-card border-border shadow-sm">
        <div className="grid grid-cols-[clamp(50px,7vw,60px)_1fr] grid-rows-[auto_1fr] gap-x-2 gap-y-1">
          <div className="w-full aspect-square rounded-full bg-muted animate-pulse" />
          <div className="min-w-0 flex flex-col gap-1">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-1 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="flex items-baseline justify-center">
            <div className="h-3 w-10 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  const calculatedStatus = calculateMetricStatus(metric.current, metric.plan, metric.forecast, metric.forecastValue, metric.forecastLabel);

  const displayValue = metric.forecastValue !== undefined
    ? metric.forecastUnit === '%'
      ? `${Math.round(metric.forecastValue)}%`
      : `${metric.forecastValue}`
    : undefined;

  const currentDisplay = Math.round(metric.current);
  const planDisplay = Math.round(metric.plan);
  const isDeviation = metric.forecastLabel === 'deviation';

  const { percent, bar } = MetricProgressBar({ current: metric.current, plan: metric.plan, size: 'sm', color: metric.color });

  const hasReserve = metric.reserve !== undefined;
  const hasLoss = metric.loss !== undefined;

  const reserveColor = metric.reserve && metric.reserve >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-full border rounded-xl p-2 text-left transition-all shadow-sm active:scale-[0.99]",
        getStatusStyles(calculatedStatus),
        calculatedStatus === 'critical'
          ? '[@media(hover:hover)]:hover:bg-red-100/50 dark:[@media(hover:hover)]:hover:bg-red-900/30'
          : calculatedStatus === 'good'
            ? '[@media(hover:hover)]:hover:bg-emerald-100/50 dark:[@media(hover:hover)]:hover:bg-emerald-900/20'
            : '[@media(hover:hover)]:hover:bg-accent/50'
      )}
    >
      <div className="grid grid-cols-[clamp(50px,7vw,60px)_1fr] grid-rows-[auto_1fr] gap-x-2 gap-y-1">
        {/* Row 1 / Col 1: Donut/Gauge */}
        <div className="w-full aspect-square">
          <KPIDonutChart
            value={metric.current}
            maxValue={metric.plan}
            forecast={metric.predictedCompletion ?? metric.forecast}
            displayValue={displayValue}
            color={metric.color}
            isDeviation={isDeviation}
            isCompact={true}
          />
        </div>

        {/* Row 1 / Col 2: Title + Value + Progress bar */}
        <div className="min-w-0 overflow-hidden flex flex-col">
          <span
            className="font-medium text-foreground line-clamp-2 leading-tight text-[clamp(12px,1.4vw,13px)]"
            title={metric.name}
          >
            {metric.name}
          </span>
          <div className="font-bold text-foreground truncate text-[clamp(14px,1.8vw,16px)] tabular-nums">
            {formatFull(currentDisplay, metric.unit)}
          </div>
          <div className="flex items-center gap-1 mt-auto">
            <div className="flex-1 min-w-0">{bar}</div>
            <span className="text-muted-foreground font-medium leading-none shrink-0 text-[clamp(10px,1.3vw,11px)] tabular-nums">
              {percent}%
            </span>
          </div>
        </div>

        {/* Row 2 / Col 1: Forecast label */}
        <div className="flex items-start justify-center pt-0.5">
          <span className="text-muted-foreground leading-none text-[clamp(10px,1.3vw,11px)]">
            {isDeviation ? 'Отклонение' : 'Прогноз'}
          </span>
        </div>

        {/* Row 2 / Col 2: Plan + Reserve/Loss (stacked) */}
        <div className="flex flex-col gap-0.5 min-w-0 text-[clamp(10px,1.3vw,11px)] leading-none">
          <span className="text-muted-foreground whitespace-nowrap">
            План: {formatFull(planDisplay, metric.unit)}
          </span>

          {hasReserve && (
            <span className={cn("font-semibold whitespace-nowrap", reserveColor)}>
              Запас: {formatReserveFull(metric.reserve!, metric.reserveUnit ?? metric.unit)}
            </span>
          )}

          {hasLoss && (
            <span className="font-semibold whitespace-nowrap text-red-500">
              Потери: {formatFull(metric.loss! > 0 ? -metric.loss! : metric.loss!, metric.unit)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
