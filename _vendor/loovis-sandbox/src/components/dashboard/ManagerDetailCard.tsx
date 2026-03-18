import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ManagerMetric {
  id: string;
  name: string;
  shortName: string;
  current: number;
  plan: number;
  unit: string;
}

interface ManagerDetailCardProps {
  id: string;
  name: string;
  avatar?: string;
  revenue: number;
  revenuePlan: number;
  metrics: ManagerMetric[];
  onClick?: (id: string) => void;
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('ru-RU');
  }
  return value.toString();
};

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

const getProgressColor = (status: 'good' | 'warning' | 'critical'): string => {
  if (status === 'good') return 'bg-success';
  if (status === 'critical') return 'bg-destructive';
  return 'bg-primary/60';
};

export function ManagerDetailCard({
  id,
  name,
  avatar,
  revenue,
  revenuePlan,
  metrics,
  onClick,
  className
}: ManagerDetailCardProps) {
  const revenuePercent = Math.round((revenue / revenuePlan) * 100);
  const revenueProgressWidth = Math.min(revenuePercent, 100);
  const revenueStatus = getStatus(revenuePercent);
  const isCritical = revenueStatus === 'critical';
  
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div 
      className={cn(
        "bg-card rounded-xl p-4 shadow-sm border border-border/50 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md",
        className
      )}
      onClick={() => onClick?.(id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {avatar && <AvatarImage src={avatar} alt={name} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm text-foreground">{name}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
      
      {/* Revenue progress bar */}
      <div className="mb-4">
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-2">
          <div 
            className={cn("h-full rounded-full transition-all", getProgressColor(revenueStatus))}
            style={{ width: `${revenueProgressWidth}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-base font-bold",
            isCritical ? "text-destructive" : "text-foreground"
          )}>
            {formatValue(revenue, '₽')} из {formatValue(revenuePlan, '₽')}
          </span>
          <span className={cn(
            "text-sm font-semibold",
            isCritical ? "text-destructive" : "text-muted-foreground"
          )}>
            {revenuePercent}%
          </span>
        </div>
      </div>
      
      {/* Metrics grid with mini progress bars */}
      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border/50">
        {metrics.map((metric) => {
          const percent = Math.round((metric.current / metric.plan) * 100);
          const progressWidth = Math.min(percent, 100);
          const status = getStatus(percent);
          const metricCritical = status === 'critical';
          
          return (
            <div key={metric.id} className="text-center">
              <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                {metric.shortName}
              </div>
              <div className={cn(
                "text-sm font-bold mb-1.5",
                metricCritical ? "text-destructive" : "text-foreground"
              )}>
                {formatValue(metric.current, metric.unit)}{metric.unit === '%' ? '%' : ''}
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", getProgressColor(status))}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
