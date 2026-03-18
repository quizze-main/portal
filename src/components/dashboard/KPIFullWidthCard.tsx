import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';
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

interface KPIFullWidthCardProps {
  metric: FullWidthKPIMetric;
  onClick?: () => void;
  showArrow?: boolean;
}

export interface FullWidthKPIMetric {
  id: string;
  name: string;
  current: number;
  plan: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  status: 'good' | 'warning' | 'critical';
  color: string;
  reserve?: number;
  reserveUnit?: string;
  loss?: number;
  forecast?: number;
  forecastValue?: number;
  forecastUnit?: string;
  forecastLabel?: 'forecast' | 'deviation';
  isMission?: boolean;
  hasChildren?: boolean;
  isLoading?: boolean;
}

export function KPIFullWidthCard({ metric, onClick, showArrow }: KPIFullWidthCardProps) {
  const effectiveShowArrow = showArrow ?? Boolean(onClick);

  // Skeleton state
  if (metric.isLoading) {
    return (
      <div className="relative w-full border rounded-xl p-2.5 lg:p-3 bg-card border-border shadow-sm">
        <div className="grid grid-cols-[clamp(68px,8vw,80px)_1fr] grid-rows-[auto_auto] gap-x-2.5 gap-y-2 min-h-[clamp(84px,10vw,100px)]">
          <div className="flex items-end justify-center">
            <div className="aspect-square w-[86%] rounded-full bg-muted animate-pulse" />
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-[5px] bg-muted rounded-full animate-pulse" />
          </div>
          <div className="flex items-baseline justify-center">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-baseline">
            <div className="h-3 w-28 bg-muted rounded animate-pulse" />
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

  const { bar } = MetricProgressBar({ current: metric.current, plan: metric.plan, size: 'md', color: metric.color });

  const reserveColor = metric.reserve && metric.reserve >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full border rounded-xl p-2.5 lg:p-3 text-left transition-all shadow-sm",
        "[@media(hover:hover)]:hover:shadow-md active:scale-[0.99]",
        getStatusStyles(calculatedStatus),
        calculatedStatus === 'critical'
          ? '[@media(hover:hover)]:hover:bg-red-100/50 dark:[@media(hover:hover)]:hover:bg-red-900/30'
          : calculatedStatus === 'good'
            ? '[@media(hover:hover)]:hover:bg-emerald-100/50 dark:[@media(hover:hover)]:hover:bg-emerald-900/20'
            : '[@media(hover:hover)]:hover:bg-accent/50'
      )}
    >
      <div className="grid grid-cols-[clamp(68px,8vw,80px)_1fr] grid-rows-[auto_auto] gap-x-2.5 gap-y-2 min-h-[clamp(84px,10vw,100px)]">
        {/* Row 1 / Col 1: Chart */}
        <div className="flex items-end justify-center">
          <div className="aspect-square w-full">
            <KPIDonutChart
              value={metric.current}
              maxValue={metric.plan}
              forecast={metric.forecast}
              displayValue={displayValue}
              color={metric.color}
              isDeviation={metric.forecastLabel === 'deviation'}
            />
          </div>
        </div>

        {/* Row 1 / Col 2: Main content */}
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground truncate">{metric.name}</span>
            {effectiveShowArrow && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </div>

          <div className="text-lg font-bold text-foreground mb-1.5 whitespace-nowrap tabular-nums">
            {formatFull(currentDisplay, metric.unit)}
          </div>

          {bar}
        </div>

        {/* Row 2 / Col 1: Forecast label */}
        <div className="flex items-baseline justify-center">
          <span className="text-muted-foreground leading-none text-[clamp(12px,1.45vw,13px)] group-[.is-edit-mode]:text-[clamp(10px,1.25vw,12px)]">
            {metric.forecastLabel === 'deviation' ? 'Отклонение' : 'Прогноз'}
          </span>
        </div>

        {/* Row 2 / Col 2: Plan + Reserve/Loss */}
        <div className="flex items-baseline justify-between gap-3 min-w-0 text-[clamp(12px,1.45vw,13px)] group-[.is-edit-mode]:text-[clamp(10px,1.25vw,12px)] group-[.is-edit-mode]:gap-2">
          <span className="text-muted-foreground whitespace-nowrap shrink-0 leading-none">
            План: {formatFull(planDisplay, metric.unit)}
          </span>

          <div className="ml-auto flex items-baseline justify-end gap-4 min-w-0 overflow-hidden group-[.is-edit-mode]:gap-2">
            {metric.reserve !== undefined && (
              <span className={cn("font-semibold whitespace-nowrap truncate leading-none", reserveColor)}>
                Запас: {formatReserveFull(metric.reserve, metric.reserveUnit ?? metric.unit)}
              </span>
            )}

            {metric.loss !== undefined && (
              <span className="font-semibold whitespace-nowrap truncate text-red-500 leading-none">
                Потери: {formatFull(metric.loss > 0 ? -metric.loss : metric.loss, '₽')}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface KPIFullWidthListProps {
  metrics: FullWidthKPIMetric[];
  onMetricClick?: (metric: FullWidthKPIMetric) => void;
}

export function KPIFullWidthList({ metrics, onMetricClick }: KPIFullWidthListProps) {
  return (
    <div className="flex flex-col gap-2">
      {metrics.map((metric) => (
        <KPIFullWidthCard
          key={metric.id}
          metric={metric}
          onClick={() => onMetricClick?.(metric)}
        />
      ))}
    </div>
  );
}
