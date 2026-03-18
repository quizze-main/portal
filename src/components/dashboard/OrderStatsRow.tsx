import { ShoppingCart, Users, CreditCard, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStat {
  id: string;
  name: string;
  value: number;
  plan: number;
  unit: string;
}

interface OrderStatsRowProps {
  stats: OrderStat[];
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
    case 'orders_count': return ShoppingCart;
    case 'avg_price': return CreditCard;
    case 'checks_count': return Users;
    case 'checks_vision': return Eye;
    default: return ShoppingCart;
  }
};

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

export function OrderStatsRow({ stats, className }: OrderStatsRowProps) {
  const gridCols = stats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';
  
  return (
    <div className={cn("grid gap-2", gridCols, className)}>
      {stats.map((stat) => {
        const percent = Math.round((stat.value / stat.plan) * 100);
        const status = getStatus(percent);
        const Icon = getIcon(stat.id);
        
        return (
          <div
            key={stat.id}
            className="bg-card rounded-xl p-3 shadow-sm border border-border/50"
          >
            {/* Icon with blue accent */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            
            {/* Value */}
            <div className={cn(
              "text-lg font-bold min-h-[28px] flex items-baseline",
              status === 'critical' ? 'text-destructive' : 'text-foreground'
            )}>
              {formatValue(stat.value, stat.unit)}
              {stat.unit !== '₽' && <span className="text-xs ml-0.5 font-normal text-muted-foreground">{stat.unit}</span>}
            </div>
            
            {/* Name */}
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight min-h-[20px] line-clamp-2">
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
