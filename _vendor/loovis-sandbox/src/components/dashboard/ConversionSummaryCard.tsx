import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { KPIGaugeChart } from './KPIGaugeChart';
import { Progress } from '@/components/ui/progress';
import type { ConversionDetailDataV2, ConversionSummary } from '@/data/conversionData';

interface ConversionSummaryCardProps {
  conversions: ConversionDetailDataV2[];
  summary: ConversionSummary;
  className?: string;
}

const getStatusColor = (percent: number): string => {
  if (percent >= 95) return 'text-emerald-600';
  if (percent >= 70) return 'text-amber-500';
  return 'text-red-500';
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace('.0', '') + ' млн ₽';
  }
  if (value >= 1000) {
    return Math.round(value / 1000) + ' тыс ₽';
  }
  return value.toLocaleString('ru-RU') + ' ₽';
};

export function ConversionSummaryCard({ conversions, summary, className }: ConversionSummaryCardProps) {
  const overallPercent = Math.round((summary.overall.current / summary.overall.plan) * 100);
  const deviation = summary.overall.current - summary.overall.plan;
  
  return (
    <Card className={cn("p-4 border-0 shadow-sm", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Main gauge */}
        <div className="flex items-center gap-4 lg:border-r lg:border-border/50 lg:pr-6">
          <KPIGaugeChart value={deviation} size={80} />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Общая конверсия</h3>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold", getStatusColor(overallPercent))}>
                {summary.overall.current}%
              </span>
              <span className="text-sm text-muted-foreground">/ {summary.overall.plan}%</span>
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {conversions.slice(0, 4).map((conv) => {
            const percent = Math.round((conv.value / conv.target) * 100);
            
            return (
              <div key={conv.id} className="text-center">
                <div className="text-xs text-muted-foreground mb-1 truncate">{conv.shortName}</div>
                <div className={cn("text-lg font-bold", getStatusColor(percent))}>
                  {conv.value}%
                </div>
                <Progress 
                  value={Math.min(percent, 100)} 
                  className="h-1 mt-1" 
                />
              </div>
            );
          })}
        </div>
        
        {/* Total loss */}
        <div className="lg:border-l lg:border-border/50 lg:pl-6 text-center lg:text-right">
          <div className="text-xs text-muted-foreground">Всего упущено</div>
          <div className="text-xl font-bold text-destructive">
            −{formatCurrency(summary.totalLostAmount)}
          </div>
          <div className="text-xs text-muted-foreground">
            {summary.totalLost} продаж
          </div>
        </div>
      </div>
    </Card>
  );
}
