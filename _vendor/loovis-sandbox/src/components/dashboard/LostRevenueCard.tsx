import { cn } from "@/lib/utils";
import { TrendingDown, AlertTriangle } from "lucide-react";

interface LostRevenueCardProps {
  amount: number;
  className?: string;
}

const formatCurrency = (value: number): string => {
  return `${value.toLocaleString('ru-RU')} ₽`;
};

const getSeverity = (amount: number): 'low' | 'medium' | 'high' => {
  if (amount >= 100000) return 'high';
  if (amount >= 50000) return 'medium';
  return 'low';
};

export function LostRevenueCard({ amount, className }: LostRevenueCardProps) {
  const severity = getSeverity(amount);
  
  const bgColor = severity === 'high' 
    ? 'bg-gradient-to-r from-destructive/15 to-destructive/5 border-destructive/30' 
    : severity === 'medium'
    ? 'bg-gradient-to-r from-warning/15 to-warning/5 border-warning/30'
    : 'bg-gradient-to-r from-muted to-muted/50 border-border/50';
  
  const iconColor = severity === 'high' 
    ? 'text-destructive bg-destructive/10' 
    : severity === 'medium'
    ? 'text-warning bg-warning/10'
    : 'text-muted-foreground bg-muted';
  
  const textColor = severity === 'high' 
    ? 'text-destructive' 
    : severity === 'medium'
    ? 'text-warning'
    : 'text-muted-foreground';

  return (
    <div className={cn(
      "rounded-2xl p-4 border transition-all",
      bgColor,
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          iconColor
        )}>
          {severity === 'high' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-0.5">Недополученная выручка</div>
          <div className={cn("text-xl font-bold", textColor)}>
            {formatCurrency(amount)}
          </div>
        </div>

        {severity !== 'low' && (
          <div className={cn(
            "px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide",
            severity === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
          )}>
            {severity === 'high' ? 'Критично' : 'Внимание'}
          </div>
        )}
      </div>
    </div>
  );
}
