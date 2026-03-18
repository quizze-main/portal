import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wrench, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull } from '@/lib/formatters';
import { KPIDonutChart } from './KPIDonutChart';

interface RepairMetric {
  current: number;
  plan: number;
}

interface ManagerRepairsBlockProps {
  avgRepairPrice: RepairMetric;
  repairsCount: number;
  className?: string;
}

export function ManagerRepairsBlock({ 
  avgRepairPrice,
  repairsCount,
  className 
}: ManagerRepairsBlockProps) {
  const pricePercent = Math.round((avgRepairPrice.current / avgRepairPrice.plan) * 100);

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-100 text-emerald-700';
    if (percent >= 85) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        {/* Two-row vertical stack layout for mobile */}
        <div className="flex flex-col gap-2">
          {/* Row 1: Header - Icon + Title + Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-rose-100">
                <Wrench className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">Ремонты</h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Repairs count badge */}
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg">
                <Package className="w-3 h-3 text-slate-500" />
                <span className="text-xs font-bold text-foreground">{repairsCount}</span>
              </div>

              {/* Status badge */}
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                getStatusBadge(pricePercent)
              )}>
                {pricePercent}%
              </span>
            </div>
          </div>

          {/* Row 2: Content - Donut + Values + Progress */}
          <div className="flex items-center gap-3">
            <KPIDonutChart 
              value={avgRepairPrice.current}
              maxValue={avgRepairPrice.plan}
              forecast={pricePercent}
              displayValue={`${pricePercent}%`}
              color="#F43F5E"
              size={36}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-foreground">{formatFull(avgRepairPrice.current, '₽')}</span>
                <span className="text-[10px] text-muted-foreground">/ {formatFull(avgRepairPrice.plan, '₽')}</span>
              </div>
              <Progress 
                value={Math.min(pricePercent, 100)} 
                className="h-1 mt-1"
                indicatorClassName="bg-rose-500"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
