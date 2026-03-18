import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface ManagerMetricData {
  id: string;
  name: string;
  current: number;
  plan: number;
  reserve?: number;
  forecast: number;
  unit: '₽' | '%' | 'шт';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface ManagerMetricRowProps {
  metric: ManagerMetricData;
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return value.toLocaleString('ru-RU');
};

type KPIStatus = 'good' | 'warning' | 'critical';

const getStatus = (percent: number): KPIStatus => {
  if (percent >= 100) return 'good';
  if (percent >= 80) return 'warning';
  return 'critical';
};

const getProgressColor = (status: KPIStatus): string => {
  switch (status) {
    case 'good':
      return 'bg-success';
    case 'warning':
      return 'bg-primary/60';
    case 'critical':
      return 'bg-destructive';
  }
};

export function ManagerMetricRow({ metric, className }: ManagerMetricRowProps) {
  const status = getStatus(metric.forecast);
  const isCritical = status === 'critical';
  
  // Calculate positions as percentages
  const currentPercent = Math.min((metric.current / metric.plan) * 100, 100);
  const reservePercent = metric.reserve && metric.reserve > 0 
    ? Math.min(((metric.current + metric.reserve) / metric.plan) * 100, 100) 
    : currentPercent;
  
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-success' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn("bg-card rounded-xl p-4 shadow-card", className)}>
      {/* Header: Name + Trend */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{metric.name}</span>
        {metric.trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {metric.trendValue && (
              <span>{metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : ''}{metric.trendValue}%</span>
            )}
          </div>
        )}
      </div>

      {/* Values row - exact KPISlider style */}
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className={cn(
          "font-bold text-base",
          isCritical ? "text-destructive" : "text-foreground"
        )}>
          {formatValue(metric.current, metric.unit)}
        </span>
        
        {metric.reserve !== undefined && metric.reserve > 0 && (
          <span className="text-kpi-reserve font-medium">
            +{formatValue(metric.reserve, metric.unit)}
          </span>
        )}
        
        <span className={cn(
          "font-semibold",
          isCritical ? "text-destructive" : "text-muted-foreground"
        )}>
          {metric.forecast}%
        </span>
        
        <span className="text-muted-foreground font-medium">
          {formatValue(metric.plan, metric.unit)}
        </span>
      </div>

      {/* Slider track - exact KPISlider style */}
      <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
        {/* Reserve bar (lighter) */}
        {metric.reserve && metric.reserve > 0 && (
          <div
            className="absolute h-full bg-kpi-reserve/40 rounded-full transition-all duration-500"
            style={{ width: `${reservePercent}%` }}
          />
        )}
        
        {/* Current progress bar */}
        <div
          className={cn(
            "absolute h-full rounded-full transition-all duration-500",
            getProgressColor(status)
          )}
          style={{ width: `${currentPercent}%` }}
        />
      </div>

      {/* Labels row - exact KPISlider style */}
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground font-medium">
        <span>Факт</span>
        {metric.reserve !== undefined && metric.reserve > 0 && (
          <span className="text-kpi-reserve">Запас</span>
        )}
        <span>Прогноз</span>
        <span>План</span>
      </div>
    </div>
  );
}
