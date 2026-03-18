import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopKPIMetric } from './TopKPICard';

interface KPIGridCardProps {
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

const getStatusBg = (status: string) => {
  switch (status) {
    case 'good': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'warning': return 'bg-amber-500/10 border-amber-500/30';
    case 'critical': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-muted border-border';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'good': return 'text-emerald-500';
    case 'warning': return 'text-amber-500';
    case 'critical': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
};

const TrendBadge = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) => {
  const color = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <span className={cn("flex items-center gap-0.5 text-[10px]", color)}>
      <Icon className="w-2.5 h-2.5" />
      {value !== undefined && <span>{trend === 'down' ? '' : '+'}{value}%</span>}
    </span>
  );
};

export function KPIGridCard({ metrics, onMetricClick }: KPIGridCardProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((metric) => {
        const percent = Math.round((metric.current / metric.plan) * 100);
        
        return (
          <button
            key={metric.id}
            onClick={() => onMetricClick?.(metric)}
            className={cn(
              "p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
              getStatusBg(metric.status)
            )}
          >
            {/* Name + Trend */}
            <div className="flex items-start justify-between gap-1 mb-1">
              <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                {metric.name}
              </span>
              <TrendBadge trend={metric.trend} value={metric.trendValue} />
            </div>
            
            {/* Value */}
            <div className="text-lg font-bold text-foreground mb-1">
              {formatValue(metric.current, metric.unit)}
            </div>
            
            {/* Percent */}
            <div className={cn("text-xs font-medium", getStatusText(metric.status))}>
              {percent}% от плана
            </div>
          </button>
        );
      })}
    </div>
  );
}
