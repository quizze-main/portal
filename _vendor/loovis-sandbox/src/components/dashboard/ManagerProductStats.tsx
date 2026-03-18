import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatFull } from '@/lib/formatters';

interface ProductMetric {
  id: string;
  name: string;
  current: number;
  plan: number;
  unit: string;
}

interface ManagerProductStatsProps {
  metrics: ProductMetric[];
  className?: string;
}

const formatValue = (value: number, unit: string) => {
  if (unit === '₽') {
    return formatFull(value, '₽');
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return `${value} ${unit}`;
};

export function ManagerProductStats({ metrics, className }: ManagerProductStatsProps) {
  if (metrics.length === 0) return null;

  return (
    <Card className={cn("p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Продуктовые метрики</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((metric) => {
          const percent = Math.round((metric.current / metric.plan) * 100);
          const isGood = percent >= 100;
          const isWarning = percent >= 80 && percent < 100;

          return (
            <div 
              key={metric.id}
              className="p-3 rounded-lg bg-secondary/30 border border-border/30"
            >
              <div className="text-xs text-muted-foreground mb-1 truncate">
                {metric.name}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-foreground tabular-nums">
                  {formatValue(metric.current, metric.unit)}
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  isGood ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-destructive"
                )}>
                  {percent}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 bg-background/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    isGood ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                план: {formatValue(metric.plan, metric.unit)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
