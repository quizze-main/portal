import { cn } from '@/lib/utils';
import { Eye, Glasses } from 'lucide-react';

interface ManagerCategory {
  id: string;
  name: string;
  quantity: number;
  quantityPlan: number;
  color: string;
}

interface ManagerCategoryTableProps {
  categories: ManagerCategory[];
  className?: string;
}

const getIcon = (id: string) => {
  switch (id) {
    case 'lenses_count': return Eye;
    case 'frames_count': return Glasses;
    default: return Eye;
  }
};

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

export function ManagerCategoryTable({ categories, className }: ManagerCategoryTableProps) {
  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b border-border/30">
        <h4 className="text-sm font-semibold text-foreground">Товарные показатели</h4>
      </div>
      
      {/* Table */}
      <div className="divide-y divide-border/30">
        {categories.map((category) => {
          const percent = Math.round((category.quantity / category.quantityPlan) * 100);
          const status = getStatus(percent);
          const Icon = getIcon(category.id);
          
          return (
            <div key={category.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Icon with category color */}
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <Icon 
                    className="w-4.5 h-4.5" 
                    style={{ color: category.color }}
                  />
                </div>
                
                {/* Name and quantity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{category.name}</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      status === 'critical' ? 'text-destructive' : 'text-foreground'
                    )}>
                      {category.quantity} шт
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(percent, 100)}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-medium w-12 text-right",
                      status === 'critical' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {category.quantity}/{category.quantityPlan}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
