import { cn } from "@/lib/utils";

interface ClubMetric {
  id: string;
  name: string;
  current: number;
  plan: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

interface ClubMetricsGridProps {
  metrics: ClubMetric[];
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽' || unit === 'K') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('ru-RU');
  }
  return value.toString();
};

const getProgressColor = (status: ClubMetric['status']): string => {
  switch (status) {
    case 'good': return 'bg-success';
    case 'warning': return 'bg-primary/50';
    case 'critical': return 'bg-destructive';
  }
};

export function ClubMetricsGrid({ metrics, className }: ClubMetricsGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {metrics.map((metric) => {
        const percent = Math.round((metric.current / metric.plan) * 100);
        const progressWidth = Math.min(percent, 100);
        const isCritical = metric.status === 'critical';
        
        return (
          <div 
            key={metric.id}
            className="bg-card rounded-xl p-3.5 shadow-sm border border-border/50"
          >
            <div className="mb-2">
              <span className="text-xs text-muted-foreground font-medium">{metric.name}</span>
            </div>
            
            <div className="flex items-baseline gap-2 mb-3">
              <span className={cn(
                "text-xl font-bold",
                isCritical ? "text-destructive" : "text-foreground"
              )}>
                {formatValue(metric.current, metric.unit)}{metric.unit === '%' ? '%' : ''}
              </span>
              <span className="text-sm text-muted-foreground">
                из {formatValue(metric.plan, metric.unit)}{metric.unit === '%' ? '%' : ''}
              </span>
            </div>
            
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressColor(metric.status))}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            
            <div className="text-xs text-muted-foreground mt-1.5 text-right font-medium">
              {percent}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
