import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttentionItem {
  id: string;
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  variant: 'warning' | 'danger' | 'info';
}

interface AttentionCardProps {
  item: AttentionItem;
  onClick?: () => void;
  className?: string;
}

const getVariantStyles = (variant: AttentionItem['variant']) => {
  switch (variant) {
    case 'danger':
      return {
        bg: 'bg-destructive-light',
        iconBg: 'bg-destructive/10',
        iconColor: 'text-destructive',
        border: 'border-destructive/20',
      };
    case 'warning':
      return {
        bg: 'bg-warning-light',
        iconBg: 'bg-warning/10',
        iconColor: 'text-warning',
        border: 'border-warning/20',
      };
    case 'info':
    default:
      return {
        bg: 'bg-primary-light',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        border: 'border-primary/20',
      };
  }
};

export function AttentionCard({ item, onClick, className }: AttentionCardProps) {
  const styles = getVariantStyles(item.variant);
  const Icon = item.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-3 border transition-all duration-200",
        styles.bg,
        styles.border,
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          styles.iconBg
        )}>
          <Icon className={cn("w-4 h-4", styles.iconColor)} />
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div className="mt-2">
        <p className="text-xs text-muted-foreground mb-0.5">{item.title}</p>
        <p className="text-lg font-semibold text-foreground">
          {item.value}
          {item.trend && item.trendValue && (
            <span className={cn(
              "ml-1 text-xs font-normal",
              item.trend === 'down' ? 'text-destructive' : 'text-success'
            )}>
              {item.trend === 'down' ? '▼' : '▲'}{item.trendValue}
            </span>
          )}
        </p>
        {item.subValue && (
          <p className="text-xs text-muted-foreground">{item.subValue}</p>
        )}
      </div>
    </div>
  );
}
