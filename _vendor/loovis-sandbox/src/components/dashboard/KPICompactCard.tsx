import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';
import { FullWidthKPIMetric } from './KPIFullWidthCard';
import { formatFull, calculateMetricStatus } from '@/lib/formatters';

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

interface KPICompactCardProps {
  metric: FullWidthKPIMetric;
  onClick?: () => void;
}

export function KPICompactCard({ metric, onClick }: KPICompactCardProps) {
  const percent = Math.round((metric.current / metric.plan) * 100);

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
        "w-full border rounded-xl p-2.5 text-left transition-all active:scale-[0.99]",
        getStatusStyles(calculatedStatus),
        calculatedStatus === 'critical' ? 'hover:bg-red-100/50 dark:hover:bg-red-900/30' : 
        calculatedStatus === 'good' ? 'hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20' : 
        'hover:bg-accent/50'
      )}
    >
      <div className="flex gap-2 items-center">
        {/* Left: Smaller Donut */}
        <div className="flex-shrink-0 w-11">
          <KPIDonutChart 
            value={metric.current} 
            maxValue={metric.plan} 
            forecast={metric.forecast}
            displayValue={displayValue}
            color={metric.color}
            size={44}
            isDeviation={metric.forecastLabel === 'deviation'}
            isCompact={true}
          />
        </div>
        
        {/* Right: Compact Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Title */}
          <span className="text-xs font-medium text-foreground truncate block">
            {metric.name}
          </span>
          
          {/* Current Value */}
          <div className="text-sm font-bold text-foreground truncate">
            {formatFull(metric.current, metric.unit)}
          </div>
          
          {/* Thin Progress Bar with Percent */}
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              {percent > 100 ? (
                <div className="flex h-full w-full">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${((percent - 100) / percent) * 100}%`,
                      backgroundColor: metric.color 
                    }}
                  />
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
            <span className="text-[9px] text-muted-foreground font-medium">
              {percent}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
