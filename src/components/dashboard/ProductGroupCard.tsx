import { cn } from "@/lib/utils";
import { Package, Glasses } from "lucide-react";

interface ProductGroupCardProps {
  type: 'lenses' | 'frames';
  quantity: number;
  quantityPlan: number;
  amount: number;
  className?: string;
}

const formatAmount = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ₽`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ₽`;
  }
  return `${value.toLocaleString('ru-RU')} ₽`;
};

export function ProductGroupCard({ 
  type, 
  quantity, 
  quantityPlan, 
  amount,
  className 
}: ProductGroupCardProps) {
  const percent = Math.round((quantity / quantityPlan) * 100);
  const progressWidth = Math.min(percent, 100);
  const isLenses = type === 'lenses';
  
  const getStatus = (p: number) => {
    if (p >= 95) return 'good';
    if (p >= 70) return 'warning';
    return 'critical';
  };
  
  const status = getStatus(percent);
  const isCritical = status === 'critical';
  
  const getProgressColor = () => {
    if (status === 'good') return 'bg-success';
    if (status === 'critical') return 'bg-destructive';
    return 'bg-primary/50';
  };

  return (
    <div className={cn("bg-card rounded-xl p-4 shadow-sm border border-border/50", className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isLenses ? "bg-primary/10" : "bg-secondary"
        )}>
          {isLenses ? (
            <Package className="w-5 h-5 text-primary" />
          ) : (
            <Glasses className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <div className="font-semibold text-sm text-foreground">{isLenses ? 'Линзы' : 'Оправы'}</div>
          <div className="text-xs text-muted-foreground">{formatAmount(amount)}</div>
        </div>
      </div>
      
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-2">
        <div 
          className={cn("h-full rounded-full transition-all", getProgressColor())}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-sm font-semibold",
          isCritical ? "text-destructive" : "text-foreground"
        )}>
          {quantity} / {quantityPlan} шт
        </span>
        <span className="text-sm text-muted-foreground font-medium">
          {percent}%
        </span>
      </div>
    </div>
  );
}
