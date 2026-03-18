import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Glasses, Eye, Frame, Sparkles, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull } from '@/lib/formatters';
import { MatrixDistribution } from '@/data/mockData';
import { KPIDonutChart } from './KPIDonutChart';

interface PriceMetric {
  current: number;
  plan: number;
}

interface ManagerAvgPriceBlockProps {
  avgGlassesPrice: PriceMetric;
  avgLensPrice: PriceMetric;
  avgFramePrice: PriceMetric;
  designShare?: PriceMetric;
  designLensPrice?: PriceMetric;
  lensMatrix?: {
    avgLensPrice: number;
    planAvgPrice: number;
    matrixDistribution: MatrixDistribution;
  };
  className?: string;
}

// Helper to format price compactly
const formatPriceShort = (value: number): string => {
  if (value >= 10000) {
    return Math.round(value / 1000) + 'к';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace('.0', '') + 'к';
  }
  return value.toLocaleString('ru-RU');
};

// Category item component
const CategoryItem = ({ 
  icon: Icon, 
  label, 
  current, 
  plan, 
  unit,
  iconColor = 'text-violet-500'
}: { 
  icon: React.ElementType; 
  label: string; 
  current: number; 
  plan: number; 
  unit: string;
  iconColor?: string;
}) => {
  const percent = Math.round((current / plan) * 100);
  const displayValue = unit === '%' ? `${current}%` : formatFull(current, unit);
  
  const getPercentColor = (p: number) => {
    if (p >= 100) return 'text-emerald-600';
    if (p >= 90) return 'text-amber-600';
    return 'text-red-600';
  };
  
  const getProgressColor = (p: number) => {
    if (p >= 100) return 'bg-emerald-500';
    if (p >= 90) return 'bg-amber-500';
    return 'bg-destructive';
  };
  
  return (
    <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg">
      <Icon className={cn("w-3 h-3 shrink-0", iconColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] text-muted-foreground truncate">{label}</span>
          <span className="text-[10px] font-bold text-foreground tabular-nums">
            {displayValue}
          </span>
        </div>
        <Progress 
          value={Math.min(percent, 100)} 
          className="h-1"
          indicatorClassName={getProgressColor(percent)}
        />
      </div>
      <span className={cn(
        "text-[9px] font-semibold tabular-nums shrink-0",
        getPercentColor(percent)
      )}>
        {percent}%
      </span>
    </div>
  );
};

export function ManagerAvgPriceBlock({ 
  avgGlassesPrice,
  avgLensPrice,
  avgFramePrice,
  designShare,
  designLensPrice,
  lensMatrix,
  className 
}: ManagerAvgPriceBlockProps) {
  const glassesPercent = Math.round((avgGlassesPrice.current / avgGlassesPrice.plan) * 100);

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-100 text-emerald-700';
    if (percent >= 90) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  // Color mapping for lens matrix cells (3-tier)
  const getCellColor = (row: string, col: string) => {
    const greenCells = ['XA', 'YA', 'XB'];
    const orangeCells = ['ZA', 'YB', 'XC'];
    const key = `${row}${col}`;
    
    if (greenCells.includes(key)) return 'bg-emerald-100 text-emerald-700';
    if (orangeCells.includes(key)) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const matrixRows = ['X', 'Y', 'Z'];
  const matrixCols = ['A', 'B', 'C', 'D'];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-violet-100">
              <Glasses className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">Средняя стоимость</h3>
          </div>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            getStatusBadge(glassesPercent)
          )}>
            {glassesPercent}%
          </span>
        </div>

        {/* Main row: Donut + Matrix */}
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          {/* Main metric with donut */}
          <div className="flex items-center gap-2 p-2 bg-violet-50/50 rounded-lg shrink-0">
            <KPIDonutChart 
              value={avgGlassesPrice.current}
              maxValue={avgGlassesPrice.plan}
              forecast={glassesPercent}
              displayValue={`${glassesPercent}%`}
              color="#8B5CF6"
              size={48}
            />
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground">Ср. очков</div>
              <div className="text-sm font-bold text-foreground">
                {formatFull(avgGlassesPrice.current, '₽')}
              </div>
              <div className="text-[9px] text-muted-foreground">
                план {formatFull(avgGlassesPrice.plan, '₽')}
              </div>
            </div>
          </div>

          {/* Compact Lens Matrix with full data */}
          {lensMatrix && (
            <div className="flex-1 p-2 bg-slate-50 rounded-lg min-w-0">
              <div className="text-[9px] text-muted-foreground mb-1.5 font-medium">Матрица линз</div>
              <div className="grid grid-cols-[14px_1fr_1fr_1fr_1fr] gap-[2px]">
                {/* Header row */}
                <div></div>
                {matrixCols.map(col => (
                  <div key={col} className="text-center text-[9px] font-semibold text-muted-foreground pb-0.5">{col}</div>
                ))}
                
                {/* Data rows */}
                {matrixRows.map(row => (
                  <React.Fragment key={`row-${row}`}>
                    <div className="flex items-center justify-center text-[10px] font-semibold text-muted-foreground">{row}</div>
                    {matrixCols.map(col => {
                      const key = `${row}${col}` as keyof MatrixDistribution;
                      const cell = lensMatrix.matrixDistribution[key];
                      return (
                        <div 
                          key={`${row}${col}`}
                          className={cn(
                            "flex flex-col items-center justify-center rounded py-1.5 min-h-[42px]",
                            getCellColor(row, col)
                          )}
                        >
                          <span className="text-[11px] font-bold leading-tight">{cell.percent}%</span>
                          <span className="text-[9px] opacity-80 leading-tight">{formatPriceShort(cell.avgPrice)}</span>
                          <span className="text-[8px] opacity-60 leading-tight">{cell.count}шт</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Categories Grid - all 4 sub-metrics */}
        <div className="grid grid-cols-2 gap-2">
          <CategoryItem 
            icon={Frame}
            label="Ср. оправы"
            current={avgFramePrice.current}
            plan={avgFramePrice.plan}
            unit="₽"
            iconColor="text-violet-500"
          />
          <CategoryItem 
            icon={Eye}
            label="Ср. линзы"
            current={avgLensPrice.current}
            plan={avgLensPrice.plan}
            unit="₽"
            iconColor="text-violet-500"
          />
          {designShare && (
            <CategoryItem 
              icon={Sparkles}
              label="Доля дизайн"
              current={designShare.current}
              plan={designShare.plan}
              unit="%"
              iconColor="text-amber-500"
            />
          )}
          {designLensPrice && (
            <CategoryItem 
              icon={CircleDollarSign}
              label="Ср. дизайн линзы"
              current={designLensPrice.current}
              plan={designLensPrice.plan}
              unit="₽"
              iconColor="text-amber-500"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}