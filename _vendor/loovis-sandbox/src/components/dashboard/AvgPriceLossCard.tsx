import React from 'react';
import { TrendingDown, Frame, Eye, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterPeriod } from './FilterBar';
import { avgPriceLossBreakdownByPeriod } from '@/data/periodData';

interface AvgPriceLossCardProps {
  period?: FilterPeriod;
}

export const AvgPriceLossCard: React.FC<AvgPriceLossCardProps> = ({ period = 'month' }) => {
  const lossData = avgPriceLossBreakdownByPeriod[period];
  // Exclude manufacturing loss from total since we can't influence it
  const totalLoss = lossData.frameLoss + lossData.lensLoss + lossData.designLoss;
  
  const lossItems = [
    { id: 'frame', name: 'Потери по оправам', icon: Frame, value: lossData.frameLoss },
    { id: 'lens', name: 'Потери по линзам', icon: Eye, value: lossData.lensLoss },
    { id: 'design', name: 'Потери по дизайну', icon: Sparkles, value: lossData.designLoss },
  ];
  
  // Calculate percentages
  const itemsWithPercent = lossItems.map(item => ({
    ...item,
    percent: totalLoss > 0 ? Math.round((item.value / totalLoss) * 100) : 0
  }));

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Потери по средней стоимости</h3>
            <p className="text-xs text-muted-foreground">Недополученная выручка</p>
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
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-sm font-semibold text-red-500 ml-2">
                    −{item.value.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
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
