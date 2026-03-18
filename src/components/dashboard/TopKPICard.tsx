import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

export type KPIStatus = 'good' | 'warning' | 'critical';

export interface TopKPIMetric {
  id: string;
  name: string;
  current: number;
  plan: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  status: KPIStatus;
}

interface TopKPICardProps {
  metric: TopKPIMetric;
  onClick?: () => void;
}

function formatValue(value: number, unit: string): string {
  if (unit === '₽') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  }
  if (unit === '%') return `${value}%`;
  return value.toLocaleString('ru-RU');
}

function getStatusColor(status: KPIStatus): string {
  switch (status) {
    case 'good': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'critical': return 'bg-destructive';
  }
}

function getStatusBgColor(status: KPIStatus): string {
  switch (status) {
    case 'good': return 'bg-success/10';
    case 'warning': return 'bg-warning/10';
    case 'critical': return 'bg-destructive/10';
  }
}

export function TopKPICard({ metric, onClick }: TopKPICardProps) {
  const { name, current, plan, unit, trend, trendValue, status } = metric;
  const percentComplete = Math.min(Math.round((current / plan) * 100), 100);
  const progressWidth = Math.min((current / plan) * 100, 100);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl p-3 shadow-sm border border-border/50",
        "transition-all duration-200",
        onClick && "cursor-pointer active:scale-[0.98] hover:shadow-md"
      )}
    >
      {/* Top row: Name + Trend */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          <div className={cn("flex items-center gap-0.5", trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {trendValue !== undefined && (
              <span className="text-xs font-medium">{trendValue}%</span>
            )}
          </div>
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </div>

      {/* Middle row: Values */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">
            {formatValue(current, unit)}
          </span>
          <span className="text-xs text-muted-foreground">{unit !== '₽' && unit !== '%' ? unit : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded",
            getStatusBgColor(status),
            status === 'good' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-destructive'
          )}>
            {percentComplete}%
          </span>
          <span className="text-xs text-muted-foreground">
            / {formatValue(plan, unit)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getStatusColor(status))}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
}