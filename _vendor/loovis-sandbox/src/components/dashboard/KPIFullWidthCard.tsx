import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';
import { formatFull, formatReserveFull, calculateMetricStatus } from '@/lib/formatters';

// Status-based styling for metric cards
const getStatusStyles = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'critical':
      return 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 ring-1 ring-red-400/30';
    case 'good':
      return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400/30';
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
  loss?: number;
  forecast?: number;
  forecastValue?: number;
  forecastUnit?: string;
  forecastLabel?: 'forecast' | 'deviation';
  isMission?: boolean;
}

export function KPIFullWidthCard({ metric, onClick, showArrow = true }: KPIFullWidthCardProps) {
  const percent = Math.round((metric.current / metric.plan) * 100);
  const reserveColor = metric.reserve && metric.reserve >= 0 
    ? 'text-emerald-500' 
    : 'text-red-500';

  // Динамический расчёт статуса на основе данных
  const calculatedStatus = calculateMetricStatus(metric.current, metric.plan, metric.forecast, metric.forecastValue, metric.forecastLabel);

  // Формируем displayValue для центра donut
  const displayValue = metric.forecastValue !== undefined
    ? metric.forecastUnit === '%' 
      ? `${metric.forecastValue}%`
      : `${metric.forecastValue}`
    : undefined;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full border rounded-xl p-3 lg:p-4 text-left transition-all hover:shadow-md active:scale-[0.99]",
        getStatusStyles(calculatedStatus),
        calculatedStatus === 'critical' ? 'hover:bg-red-100/50 dark:hover:bg-red-900/30' : 
        calculatedStatus === 'good' ? 'hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20' : 
        'hover:bg-accent/50'
      )}
    >
      <div className="flex gap-3">
        {/* Left: Donut - fixed width for consistent alignment */}
        <div className="flex flex-col items-center justify-end gap-0.5 flex-shrink-0 w-20">
          <KPIDonutChart 
            value={metric.current} 
            maxValue={metric.plan} 
            forecast={metric.forecast}
            displayValue={displayValue}
            color={metric.color}
            size={64}
            isDeviation={metric.forecastLabel === 'deviation'}
          />
          <span className="text-xs text-muted-foreground">
            {metric.forecastLabel === 'deviation' ? 'отклонение' : 'прогноз'}
          </span>
        </div>
        
        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Arrow */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground truncate">{metric.name}</span>
            {showArrow && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </div>
          
          {/* Current Value */}
          <div className="text-lg font-bold text-foreground mb-1.5 whitespace-nowrap">
            {formatFull(metric.current, metric.unit)}
          </div>
          
          {/* Progress Bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
            {percent > 100 ? (
              <div className="flex h-full w-full">
                {/* Левая часть: перевыполнение — насыщенный цвет */}
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${((percent - 100) / percent) * 100}%`,
                    backgroundColor: metric.color 
                  }}
                />
                {/* Правая часть: план — светлый цвет */}
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${(100 / percent) * 100}%`,
                    backgroundColor: metric.color,
                    opacity: 0.4
                  }}
                />
              </div>
            ) : (
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${percent}%`,
                  backgroundColor: metric.color 
                }}
              />
            )}
          </div>
          
          {/* Plan + Reserve/Loss */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground whitespace-nowrap">
              План: {formatFull(metric.plan, metric.unit)}
            </span>
            
            {metric.reserve !== undefined && (
              <span className={cn("font-semibold whitespace-nowrap", reserveColor)}>
                Запас: {formatReserveFull(metric.reserve, metric.unit)}
              </span>
            )}
            
            {metric.loss !== undefined && (
              <span className="font-semibold whitespace-nowrap text-red-500">
                Потери: −{formatFull(metric.loss, '₽')}
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
