import { cn } from '@/lib/utils';
import { ShoppingBag, Package, Glasses, Disc, Wrench, LucideIcon } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  quantity: number;
  quantityPlan: number;
  amount: number;
  amountPlan: number;
  color: string;
  description?: string;
}

interface CategoryTableProps {
  categories: Category[];
  className?: string;
}

const formatAmount = (value: number): string => {
  return value.toLocaleString('ru-RU') + ' ₽';
};

const getProgressColor = (percent: number): string => {
  if (percent >= 95) return 'bg-emerald-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-destructive';
};

const getIconColor = (percent: number): string => {
  if (percent >= 95) return 'text-emerald-500';
  if (percent >= 70) return 'text-amber-500';
  return 'text-destructive';
};

const getBadgeStyles = (percent: number): string => {
  if (percent >= 95) return 'bg-emerald-500/15 text-emerald-600';
  if (percent >= 70) return 'bg-amber-500/15 text-amber-600';
  return 'bg-destructive/15 text-destructive';
};

const getCategoryIcon = (name: string): LucideIcon => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('комплект')) return Package;
  if (lowerName.includes('оправ')) return Glasses;
  if (lowerName.includes('линз')) return Disc;
  if (lowerName.includes('ремонт')) return Wrench;
  return Package;
};

export function CategoryTable({ categories, className }: CategoryTableProps) {
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalAmountPlan = categories.reduce((sum, cat) => sum + cat.amountPlan, 0);
  const totalPercent = Math.round((totalAmount / totalAmountPlan) * 100);

  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-violet-500" />
            <h4 className="text-sm font-semibold text-foreground">Товарные категории</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{formatAmount(totalAmount)}</span>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              getBadgeStyles(totalPercent)
            )}>
              {totalPercent}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Categories */}
      <div className="p-4 space-y-1">
        {categories.map((category, index) => {
          const percent = Math.round((category.amount / category.amountPlan) * 100);
          const Icon = getCategoryIcon(category.name);
          const isLast = index === categories.length - 1;
          
          return (
            <div 
              key={category.id} 
              className={cn(
                "py-3 px-2 -mx-2 rounded-lg transition-colors hover:bg-muted/40 cursor-pointer",
                !isLast && "border-b border-border/20"
              )}
            >
              {/* Row 1: Icon + Name + Percent */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("w-4 h-4 flex-shrink-0", getIconColor(percent))} />
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  getBadgeStyles(percent)
                )}>
                  {percent}%
                </span>
              </div>
              
              {/* Row 2: Progress bar */}
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                <div
                  className={cn("h-full rounded-full transition-all", getProgressColor(percent))}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              
              {/* Row 3: Amounts */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-foreground">{formatAmount(category.amount)}</span>
                <span className="text-[11px] text-muted-foreground">из {formatAmount(category.amountPlan)}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer total */}
      <div className="px-4 py-2.5 bg-muted/30 border-t border-border/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Итого план</span>
          <span className="text-xs text-muted-foreground">{formatAmount(totalAmountPlan)}</span>
        </div>
      </div>
    </div>
  );
}
