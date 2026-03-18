import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';

interface MarginMetric {
  current: number;
  plan: number;
}

interface ManagerMarginBlockProps {
  margin: MarginMetric;
  className?: string;
}

const formatFull = (value: number): string => 
  value.toLocaleString('ru-RU');

export function ManagerMarginBlock({ 
  margin,
  className 
}: ManagerMarginBlockProps) {
  const marginPercent = Math.round((margin.current / margin.plan) * 100);
  const deviation = margin.current - margin.plan;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        {/* Two-row vertical stack layout for mobile */}
        <div className="flex flex-col gap-2">
          {/* Row 1: Header - Icon + Title + Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-cyan-100">
                <PiggyBank className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">Маржа</h3>
            </div>

            {/* Deviation badge */}
            <div className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
              deviation >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}>
              {deviation >= 0 ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              <span>{deviation >= 0 ? '+' : '−'}{formatFull(Math.abs(deviation))} ₽</span>
            </div>
          </div>

          {/* Row 2: Content - Donut + Values + Progress */}
          <div className="flex items-center gap-3">
            <KPIDonutChart 
              value={margin.current}
              maxValue={margin.plan}
              forecast={marginPercent}
              displayValue={`${marginPercent}%`}
              color="#06B6D4"
              size={36}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-foreground">{formatFull(margin.current)} ₽</span>
                <span className="text-[10px] text-muted-foreground">/ план {formatFull(margin.plan)} ₽</span>
              </div>
              <Progress 
                value={Math.min(marginPercent, 100)} 
                className="h-1 mt-1"
                indicatorClassName="bg-cyan-500"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
