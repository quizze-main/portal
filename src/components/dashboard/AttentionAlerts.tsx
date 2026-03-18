import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, FileX } from 'lucide-react';

interface AttentionAlert {
  id: string;
  name: string;
  count: number;
  variant: 'critical' | 'warning' | 'info';
}

interface AttentionAlertsProps {
  alerts: AttentionAlert[];
  className?: string;
}

const getIcon = (id: string) => {
  switch (id) {
    case 'overdue': return Clock;
    case 'unpaid': return FileX;
    case 'review': return AlertTriangle;
    default: return AlertTriangle;
  }
};

const getVariantStyles = (variant: AttentionAlert['variant']) => {
  switch (variant) {
    case 'critical':
      return {
        bg: 'bg-destructive/10',
        border: 'border-destructive/20',
        icon: 'text-destructive',
        badge: 'bg-destructive text-destructive-foreground'
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        icon: 'text-amber-500',
        badge: 'bg-amber-500 text-white'
      };
    case 'info':
      return {
        bg: 'bg-primary/10',
        border: 'border-primary/20',
        icon: 'text-primary',
        badge: 'bg-primary text-primary-foreground'
      };
  }
};

export function AttentionAlerts({ alerts, className }: AttentionAlertsProps) {
  const totalCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
  
  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-border/30 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Требуют внимания</h4>
        <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          {totalCount}
        </span>
      </div>
      
      {/* Alerts grid */}
      <div className="grid grid-cols-3 divide-x divide-border/30">
        {alerts.map((alert) => {
          const styles = getVariantStyles(alert.variant);
          const Icon = getIcon(alert.id);
          
          return (
            <div 
              key={alert.id} 
              className={cn(
                "p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                "hover:bg-muted/50"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                styles.bg
              )}>
                <Icon className={cn("w-5 h-5", styles.icon)} />
              </div>
              
              {/* Count badge */}
              <span className={cn(
                "text-sm font-bold px-2.5 py-0.5 rounded-full",
                styles.badge
              )}>
                {alert.count}
              </span>
              
              {/* Label */}
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {alert.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
