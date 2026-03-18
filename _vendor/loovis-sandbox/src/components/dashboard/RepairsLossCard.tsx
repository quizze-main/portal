import React from 'react';
import { TrendingDown, Wrench, TrendingUp } from 'lucide-react';
import { FilterPeriod } from './FilterBar';
import { repairsLossByPeriod } from '@/data/periodData';
import { Progress } from '@/components/ui/progress';

interface RepairsLossCardProps {
  period?: FilterPeriod;
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

export const RepairsLossCard: React.FC<RepairsLossCardProps> = ({ period = 'month' }) => {
  const lossData = repairsLossByPeriod[period];
  const totalLoss = lossData.totalLoss;
  const isReserve = totalLoss < 0;
  const byReason = lossData.byReason || [];
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isReserve ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}>
            {isReserve ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              {isReserve ? 'Запас по средней стоимости ремонтов' : 'Потери по средней стоимости ремонтов'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isReserve ? 'Перевыполнение плана' : 'Недополученная выручка'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${isReserve ? 'text-emerald-500' : 'text-red-500'}`}>
            {isReserve 
              ? `+${formatNumber(Math.abs(totalLoss))} ₽`
              : `−${formatNumber(totalLoss)} ₽`
            }
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {/* Breakdown by reason */}
        {byReason.length > 0 && !isReserve && (
          <div className="space-y-2">
            {byReason.map((reason) => (
              <div key={reason.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{reason.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{reason.percent}%</span>
                    <span className="font-medium text-red-600">−{formatNumber(reason.loss)} ₽</span>
                  </div>
                </div>
                <Progress 
                  value={reason.percent} 
                  className="h-1.5 bg-muted" 
                />
              </div>
            ))}
          </div>
        )}

        {/* Summary text */}
        <p className="text-sm text-muted-foreground pt-1">
          {isReserve 
            ? 'Средняя стоимость ремонтов выше плана — отличная работа команды!'
            : 'Средняя стоимость ремонтов ниже плана. Рекомендуем акцент на сложные ремонты и допродажи.'
          }
        </p>
      </div>
    </div>
  );
};
