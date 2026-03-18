import { Users, CreditCard, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManagerStat {
  id: string;
  name: string;
  value: number;
  plan: number;
  unit: string;
}

interface ManagerStatsRowProps {
  stats: ManagerStat[];
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  }
  return value.toLocaleString('ru-RU');
};

const getIcon = (id: string) => {
  switch (id) {
    case 'clients': return Users;
    case 'avg_check': return CreditCard;
    case 'checks_count': return Receipt;
    default: return Users;
  }
};

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

export function ManagerStatsRow({ stats, className }: ManagerStatsRowProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {stats.map((stat) => {
        const percent = Math.round((stat.value / stat.plan) * 100);
        const status = getStatus(percent);
        const Icon = getIcon(stat.id);
        
        return (
          <div
            key={stat.id}
            className="bg-card rounded-xl p-3 shadow-sm border border-border/50"
          >
            {/* Icon */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            
            {/* Value */}
            <div className={cn(
              "text-lg font-bold",
              status === 'critical' ? 'text-destructive' : 'text-foreground'
            )}>
              {formatValue(stat.value, stat.unit)}
              {stat.unit !== '₽' && stat.unit && (
                <span className="text-xs ml-0.5 font-normal text-muted-foreground">{stat.unit}</span>
              )}
            </div>
            
            {/* Name */}
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              {stat.name}
            </div>
            
            {/* Mini progress bar */}
            <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status === 'good' && 'bg-success',
                  status === 'warning' && 'bg-primary',
                  status === 'critical' && 'bg-destructive'
                )}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            
            {/* Percentage */}
            <div className="text-[10px] text-muted-foreground mt-1 text-right">
              {percent}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
