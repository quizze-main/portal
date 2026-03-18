import React from 'react';
import { TrendingDown, Package, Users, PercentCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterPeriod } from './FilterBar';
import { marginLossBreakdownByPeriod } from '@/data/marginData';

interface MarginLossCardProps {
  period?: FilterPeriod;
}

export const MarginLossCard: React.FC<MarginLossCardProps> = ({ period = 'month' }) => {
  const lossData = marginLossBreakdownByPeriod[period];
  const totalLoss = lossData.totalLoss;
  
  const lossItems = [
    { id: 'lowMargin', name: 'Низкая маржа на товары', description: 'Продажа товаров с маржинальностью ниже целевой', icon: Package, value: lossData.byLowMarginProducts },
    { id: 'efficiency', name: 'Эффективность менеджеров', description: 'Неоптимальный микс товаров в заказах', icon: Users, value: lossData.byManagerEfficiency },
    { id: 'discounts', name: 'Скидки сверх нормы', description: 'Предоставление скидок выше допустимого уровня', icon: PercentCircle, value: lossData.byExcessiveDiscounts },
  ];
  
  // Calculate percentages
  const itemsWithPercent = lossItems.map(item => ({
    ...item,
    percent: totalLoss > 0 ? Math.round((item.value / totalLoss) * 100) : 0
  }));

  // Sort by value descending
  itemsWithPercent.sort((a, b) => b.value - a.value);

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Потери по марже</h3>
            <p className="text-xs text-muted-foreground">Упущенная маржинальная прибыль</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-red-500">
            −{totalLoss.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {itemsWithPercent.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-sm font-semibold text-red-500 ml-2">
                    −{item.value.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                  {item.description}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500/60 rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {item.percent}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
