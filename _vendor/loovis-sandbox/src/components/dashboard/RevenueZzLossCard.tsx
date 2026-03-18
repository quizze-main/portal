import { TrendingDown, TrendingUp, Users, Clock, BarChart3, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatFull } from '@/lib/formatters';
import { FilterPeriod } from './FilterBar';
import { revenueZzLossBreakdownByPeriod } from '@/data/periodData';

const formatCurrency = (value: number) => formatFull(value, '₽');

interface LossCategory {
  id: string;
  label: string;
  value: number;
  percentage: number;
  icon: React.ElementType;
  description: string;
}

interface RevenueZzLossCardProps {
  period: FilterPeriod;
}

export function RevenueZzLossCard({ period }: RevenueZzLossCardProps) {
  const lossData = revenueZzLossBreakdownByPeriod[period];
  const totalLoss = lossData.totalLoss;
  const isReserve = totalLoss < 0;
  
  const categories: LossCategory[] = [
    {
      id: 'employee',
      label: 'Эффективность сотрудников',
      value: Math.abs(lossData.employeeLoss),
      percentage: Math.round((Math.abs(lossData.employeeLoss) / Math.abs(totalLoss)) * 100),
      icon: Users,
      description: 'Отклонение от лучшего результата по закрытиям'
    },
    {
      id: 'unissued',
      label: 'Не выданные в срок',
      value: Math.abs(lossData.unissuedLoss),
      percentage: Math.round((Math.abs(lossData.unissuedLoss) / Math.abs(totalLoss)) * 100),
      icon: Clock,
      description: 'Заказы готовые к выдаче, но не закрытые'
    },
    {
      id: 'arpc',
      label: 'Потери по среднему чеку',
      value: Math.abs(lossData.arpcLoss),
      percentage: Math.round((Math.abs(lossData.arpcLoss) / Math.abs(totalLoss)) * 100),
      icon: BarChart3,
      description: 'Низкий средний чек закрытых заказов'
    }
  ].sort((a, b) => b.value - a.value);

  const maxPercentage = Math.max(...categories.map(c => c.percentage));

  return (
    <Card className={`p-4 border ${
      isReserve 
        ? 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30' 
        : 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isReserve ? 'bg-emerald-500/10' : 'bg-destructive/10'
          }`}>
            {isReserve 
              ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              : <TrendingDown className="w-4 h-4 text-destructive" />
            }
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {isReserve ? 'Запас' : 'Потери'}
          </h3>
        </div>
        <span className={`text-lg font-bold ${
          isReserve ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
        }`}>
          {isReserve ? '+' : '−'}{formatCurrency(Math.abs(totalLoss))}
        </span>
      </div>

      {/* Loss categories */}
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
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  isReserve ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                }`}>
                  {isReserve ? '+' : '−'}{formatCurrency(category.value)}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isReserve ? 'bg-emerald-500/70' : 'bg-destructive/70'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
