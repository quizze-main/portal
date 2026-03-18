import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';
import { FullWidthKPIMetric } from './KPIFullWidthCard';
import { MetricProgressBar } from './MetricProgressBar';
import { formatFull, calculateMetricStatus } from '@/lib/formatters';

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
      <div className="w-full border rounded-xl p-2 bg-card border-border shadow-sm">
        <div className="grid grid-cols-[clamp(50px,7vw,60px)_1fr] grid-rows-[auto_auto] gap-x-2 gap-y-1 min-h-[clamp(66px,9vw,78px)]">
          <div className="w-full aspect-square rounded-full bg-muted animate-pulse" />
          <div className="min-w-0 flex flex-col gap-1">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-baseline justify-center">
            <div className="h-3 w-14 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1">
            <div className="flex-1 h-1 bg-muted rounded-full animate-pulse" />
            <div className="h-3 w-6 bg-muted rounded animate-pulse" />
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

  const { percent, bar } = MetricProgressBar({ current: metric.current, plan: metric.plan, size: 'sm', color: metric.color });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full border rounded-xl p-2 text-left transition-all shadow-sm active:scale-[0.99]",
        getStatusStyles(calculatedStatus),
        calculatedStatus === 'critical'
          ? '[@media(hover:hover)]:hover:bg-red-100/50 dark:[@media(hover:hover)]:hover:bg-red-900/30'
          : calculatedStatus === 'good'
            ? '[@media(hover:hover)]:hover:bg-emerald-100/50 dark:[@media(hover:hover)]:hover:bg-emerald-900/20'
            : '[@media(hover:hover)]:hover:bg-accent/50'
      )}
    >
      <div className="grid grid-cols-[clamp(50px,7vw,60px)_1fr] grid-rows-[auto_auto] gap-x-2 gap-y-1 min-h-[clamp(66px,9vw,78px)]">
        {/* Row 1 / Col 1: Donut/Gauge */}
        <div className="w-full aspect-square">
          <KPIDonutChart
            value={metric.current}
            maxValue={metric.plan}
            forecast={metric.forecast}
            displayValue={displayValue}
            color={metric.color}
            isDeviation={metric.forecastLabel === 'deviation'}
            isCompact={true}
          />
        </div>

        {/* Row 1 / Col 2: Title + Value */}
        <div className="min-w-0 overflow-hidden flex flex-col">
          <span
            className="font-medium text-foreground truncate block text-[clamp(12px,1.4vw,13px)]"
            title={metric.name}
          >
            {metric.name}
          </span>
          <div className="font-bold text-foreground truncate text-[clamp(14px,1.8vw,16px)] tabular-nums">
            {formatFull(currentDisplay, metric.unit)}
          </div>
        </div>

        {/* Row 2 / Col 1: Forecast label */}
        <div className="flex items-baseline justify-center">
          <span className="text-muted-foreground leading-none text-[clamp(11px,1.4vw,12px)]">
            {metric.forecastLabel === 'deviation' ? 'Отклонение' : 'Прогноз'}
          </span>
        </div>

        {/* Row 2 / Col 2: Progress bar + percent */}
        <div className="flex items-center gap-1 min-w-0 pl-[5px]">
          <div className="flex-1 min-w-0">{bar}</div>
          <span className="text-muted-foreground font-medium leading-none shrink-0 text-[clamp(11px,1.3vw,12px)]">
            {percent}%
          </span>
        </div>
      </div>
    </button>
  );
}
