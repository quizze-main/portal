import React from 'react';
import { Users, Banknote, TrendingDown } from 'lucide-react';
import { FilterPeriod } from './FilterBar';
import { clientsLossByPeriod } from '@/data/periodData';

interface ClientsLossCardProps {
  period?: FilterPeriod;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' ₽';
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(value);
};

export const ClientsLossCard: React.FC<ClientsLossCardProps> = ({ period = 'month' }) => {
  const lossData = clientsLossByPeriod[period];
  
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Потери по ФЛ</h3>
            <p className="text-xs text-muted-foreground">Недополученная выручка</p>
          </div>
        </div>
        <span className="text-lg font-bold text-destructive">
          −{formatCurrency(lossData.totalLoss)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Не дошедших клиентов</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {formatNumber(lossData.missedClients)} чел.
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Фактический средний чек</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(lossData.avgCheck)}
          </span>
        </div>

        {/* Formula visualization */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-medium text-foreground">{formatNumber(lossData.missedClients)} чел.</span>
            <span className="text-muted-foreground">×</span>
            <span className="font-medium text-foreground">{formatCurrency(lossData.avgCheck)}</span>
            <span className="text-muted-foreground">=</span>
            <span className="font-bold text-destructive">−{formatCurrency(lossData.totalLoss)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
