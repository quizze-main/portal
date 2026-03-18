import { TrendingDown, Percent, BarChart3, Users, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatFull } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => formatFull(value, '₽');

interface LossCategory {
  id: string;
  label: string;
  value: number;
  percentage: number;
  icon: React.ElementType;
  description: string;
}

interface ManagerLossBreakdownProps {
  totalLoss: number;
  conversionLoss: number;
  avgCheckLoss: number;
  clientsLoss: number;
  className?: string;
}

export function ManagerLossBreakdown({
  totalLoss,
  conversionLoss,
  avgCheckLoss,
  clientsLoss,
  className
}: ManagerLossBreakdownProps) {
  // If total is positive (losses), show breakdown
  // If total is negative (reserve/over-achievement), show differently
  const isReserve = totalLoss < 0;
  const displayTotal = Math.abs(totalLoss);
  
  const categories: LossCategory[] = [
    {
      id: 'conversion',
      label: 'Потери по конверсии',
      value: conversionLoss,
      percentage: displayTotal > 0 ? Math.round((Math.abs(conversionLoss) / displayTotal) * 100) : 0,
      icon: Percent,
      description: 'Разница между фактической и целевой конверсией, умноженная на средний чек'
    },
    {
      id: 'avgCheck',
      label: 'Потери по среднему чеку',
      value: avgCheckLoss,
      percentage: displayTotal > 0 ? Math.round((Math.abs(avgCheckLoss) / displayTotal) * 100) : 0,
      icon: BarChart3,
      description: 'Разница между фактическим и плановым средним чеком'
    },
    {
      id: 'clients',
      label: 'Потери по клиентам',
      value: clientsLoss,
      percentage: displayTotal > 0 ? Math.round((Math.abs(clientsLoss) / displayTotal) * 100) : 0,
      icon: Users,
      description: 'Недополученная выручка из-за недобора клиентов'
    }
  ].filter(c => c.value !== 0).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const maxPercentage = Math.max(...categories.map(c => c.percentage), 1);

  return (
    <Card className={cn(
      "p-4 border",
      isReserve 
        ? "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20"
        : "bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isReserve ? "bg-emerald-500/10" : "bg-destructive/10"
          )}>
            <TrendingDown className={cn(
              "w-4 h-4",
              isReserve ? "text-emerald-600 rotate-180" : "text-destructive"
            )} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {isReserve ? 'Запас' : 'Потери'}
          </h3>
        </div>
        <span className={cn(
          "text-lg font-bold",
          isReserve ? "text-emerald-600" : "text-destructive"
        )}>
          {isReserve ? '+' : '−'}{formatCurrency(displayTotal)}
        </span>
      </div>

      {/* Loss categories */}
      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const barWidth = (category.percentage / maxPercentage) * 100;
            
            return (
              <div key={category.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground">{category.label}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="p-0.5 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0">
                          <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-auto max-w-[220px] p-2">
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </PopoverContent>
                    </Popover>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium flex-shrink-0">
                      {category.percentage}%
                    </Badge>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold flex-shrink-0",
                    isReserve ? "text-emerald-600" : "text-destructive"
                  )}>
                    {isReserve ? '+' : '−'}{formatCurrency(Math.abs(category.value))}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isReserve ? "bg-emerald-500/70" : "bg-destructive/70"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categories.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Нет данных о потерях
        </p>
      )}
    </Card>
  );
}
