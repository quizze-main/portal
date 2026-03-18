import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { FilterPeriod } from './FilterBar';
import { conversionLossByPeriod, type ConversionLossBreakdown } from '@/data/conversionData';

interface ConversionLossCardProps {
  period: FilterPeriod;
  className?: string;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace('.0', '') + ' млн ₽';
  }
  if (value >= 1000) {
    return Math.round(value / 1000) + ' тыс ₽';
  }
  return value.toLocaleString('ru-RU') + ' ₽';
};

const formatFullCurrency = (value: number): string => {
  return value.toLocaleString('ru-RU') + ' ₽';
};

export function ConversionLossCard({ period, className }: ConversionLossCardProps) {
  const lossData = conversionLossByPeriod[period] || conversionLossByPeriod['month'];
  
  // Calculate percentages for visualization
  const maxLoss = Math.max(...lossData.byConversion.map(c => c.loss));
  
  return (
    <Card className={cn("border-0 shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h4 className="text-sm font-semibold text-foreground">Упущенная выручка по конверсиям</h4>
          </div>
          <div className="text-lg font-bold text-destructive">
            −{formatCurrency(lossData.totalLoss)}
          </div>
        </div>
      </div>
      
      {/* Breakdown */}
      <div className="p-4 space-y-3">
        {lossData.byConversion.map((item, index) => {
          const widthPercent = (item.loss / maxLoss) * 100;
          
          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{item.name}</span>
                <span className="text-sm font-medium text-destructive">
                  −{formatFullCurrency(item.loss)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
