import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopKPIMetric } from './TopKPICard';

interface KPISummaryCardProps {
  metrics: TopKPIMetric[];
  onMetricClick?: (metric: TopKPIMetric) => void;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽' || unit === 'руб') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  }
  if (unit === '%') return `${value}%`;
  return value.toString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'good': return 'bg-emerald-500';
    case 'warning': return 'bg-amber-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-muted';
  }
};

const TrendIcon = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) => {
  const color = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <span className={cn("flex items-center gap-0.5 text-xs", color)}>
      <Icon className="w-3 h-3" />
      {value !== undefined && <span>{trend === 'down' ? '' : '+'}{value}%</span>}
    </span>
  );
};

export function KPISummaryCard({ metrics, onMetricClick }: KPISummaryCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ключевые показатели</h3>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="divide-y divide-border/50">
        {metrics.map((metric) => {
          const percent = Math.round((metric.current / metric.plan) * 100);
          
          return (
            <button
              key={metric.id}
              onClick={() => onMetricClick?.(metric)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
            >
              {/* Name */}
              <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                {metric.name}
              </span>
              
              {/* Value */}
              <span className="text-sm font-semibold text-foreground w-14 text-right">
                {formatValue(metric.current, metric.unit)}
              </span>
              
              {/* Mini progress bar */}
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", getStatusColor(metric.status))}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              
              {/* Percent */}
              <span className={cn(
                "text-xs font-medium w-10 text-right",
                metric.status === 'good' ? 'text-emerald-500' : 
                metric.status === 'warning' ? 'text-amber-500' : 'text-red-500'
              )}>
                {percent}%
              </span>
              
              {/* Trend */}
              <div className="w-12">
                <TrendIcon trend={metric.trend} value={metric.trendValue} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
