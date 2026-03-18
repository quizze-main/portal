import { AlertTriangle, Clock, Wrench, UserX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatFull } from '@/lib/formatters';

interface AttentionItemData {
  id: string;
  label: string;
  count: number;
  amount?: number;
  icon: React.ElementType;
  variant: 'critical' | 'warning' | 'info';
}

interface ManagerAttentionCardProps {
  unclosedOrders?: { count: number; amount: number };
  notOnTime?: { count: number };
  repairs?: { count: number };
  pendingFollowUp?: { count: number };
  className?: string;
  onClick?: () => void;
}

const formatCurrency = (value: number) => formatFull(value, '₽');

export function ManagerAttentionCard({
  unclosedOrders,
  notOnTime,
  repairs,
  pendingFollowUp,
  className,
  onClick
}: ManagerAttentionCardProps) {
  const items: AttentionItemData[] = [];

  if (unclosedOrders && unclosedOrders.count > 0) {
    items.push({
      id: 'unclosed',
      label: 'Незакрытые заказы',
      count: unclosedOrders.count,
      amount: unclosedOrders.amount,
      icon: AlertTriangle,
      variant: 'critical'
    });
  }

  if (notOnTime && notOnTime.count > 0) {
    items.push({
      id: 'notOnTime',
      label: 'Не в срок',
      count: notOnTime.count,
      icon: Clock,
      variant: 'warning'
    });
  }

  if (repairs && repairs.count > 0) {
    items.push({
      id: 'repairs',
      label: 'Ремонты',
      count: repairs.count,
      icon: Wrench,
      variant: 'warning'
    });
  }

  if (pendingFollowUp && pendingFollowUp.count > 0) {
    items.push({
      id: 'followUp',
      label: 'Ожидают follow-up',
      count: pendingFollowUp.count,
      icon: UserX,
      variant: 'info'
    });
  }

  if (items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  const getVariantStyles = (variant: 'critical' | 'warning' | 'info') => {
    switch (variant) {
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'info':
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer hover:bg-secondary/30 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Требуют внимания</h3>
        </div>
        <span className="text-lg font-bold text-amber-600">
          {totalCount}
        </span>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id}
              className={cn(
                "p-2 rounded-lg border",
                getVariantStyles(item.variant)
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">{item.count}</span>
                {item.amount && (
                  <span className="text-[10px] text-muted-foreground">
                    / {formatCurrency(item.amount)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
