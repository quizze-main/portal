import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Glasses } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull } from '@/lib/formatters';

// Types matching periodData.ts
type LensSegment = 'A' | 'B' | 'C' | 'D';
type IndexGroup = 'X' | 'Y' | 'Z';

interface MatrixCell {
  percent: number;
  avgPrice: number;
  count: number;
}

interface MatrixDistribution {
  XA: MatrixCell;
  XB: MatrixCell;
  XC: MatrixCell;
  XD: MatrixCell;
  YA: MatrixCell;
  YB: MatrixCell;
  YC: MatrixCell;
  YD: MatrixCell;
  ZA: MatrixCell;
  ZB: MatrixCell;
  ZC: MatrixCell;
  ZD: MatrixCell;
}

interface ManagerLensMatrixProps {
  avgLensPrice: number;
  planAvgPrice: number;
  matrixDistribution: MatrixDistribution;
  className?: string;
}

const LENS_SEGMENTS: LensSegment[] = ['A', 'B', 'C', 'D'];
const INDEX_GROUPS: IndexGroup[] = ['X', 'Y', 'Z'];
const INDEX_GROUP_LABELS: Record<IndexGroup, string> = {
  X: '1.74+1.67',
  Y: '1.60+1.59',
  Z: '1.56+1.50'
};

// Color coding by cell position
const getCellColor = (group: IndexGroup, segment: LensSegment): string => {
  const key = `${group}${segment}`;
  
  // Premium (green): XA, YA, XB
  if (key === 'XA' || key === 'YA' || key === 'XB') {
    return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  }
  
  // Medium (orange): ZA, YB, XC
  if (key === 'ZA' || key === 'YB' || key === 'XC') {
    return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  }
  
  // Economy (red): all others
  return 'bg-red-500/20 text-red-700 dark:text-red-400';
};

// Compact price format (12800 → "13к")
const formatPriceShort = (value: number): string => {
  if (value >= 10000) {
    return Math.round(value / 1000) + 'к';
  }
  return value.toLocaleString('ru-RU');
};

const formatCurrency = (value: number) => formatFull(value, '₽');

export function ManagerLensMatrix({ 
  avgLensPrice, 
  planAvgPrice, 
  matrixDistribution,
  className 
}: ManagerLensMatrixProps) {
  const planPercent = Math.round((avgLensPrice / planAvgPrice) * 100);

  // Calculate color bar segments
  const greenPercent = matrixDistribution.XA.percent + matrixDistribution.YA.percent + matrixDistribution.XB.percent;
  const orangePercent = matrixDistribution.ZA.percent + matrixDistribution.YB.percent + matrixDistribution.XC.percent;
  const redPercent = matrixDistribution.ZB.percent + matrixDistribution.YC.percent + matrixDistribution.YD.percent + 
                     matrixDistribution.ZC.percent + matrixDistribution.ZD.percent + matrixDistribution.XD.percent;

  return (
    <Card className={cn("p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Glasses className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Матрица линз</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatCurrency(avgLensPrice)}
          </span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs tabular-nums",
              planPercent >= 100 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                : planPercent >= 80 
                  ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                  : "bg-red-500/10 text-red-600 border-red-500/30"
            )}
          >
            {planPercent}%
          </Badge>
        </div>
      </div>

      {/* Color distribution bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-4">
        {greenPercent > 0 && (
          <div style={{ width: `${greenPercent}%` }} className="bg-emerald-500" />
        )}
        {orangePercent > 0 && (
          <div style={{ width: `${orangePercent}%` }} className="bg-amber-500" />
        )}
        {redPercent > 0 && (
          <div style={{ width: `${redPercent}%` }} className="bg-red-500" />
        )}
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[320px] space-y-1">
          {/* Column Headers */}
          <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] gap-1">
            <div /> {/* Empty corner */}
            {LENS_SEGMENTS.map((segment) => (
              <div 
                key={segment} 
                className="text-xs text-center font-bold py-1 rounded-t bg-muted/50 text-muted-foreground"
              >
                {segment}
              </div>
            ))}
          </div>
          
          {/* Matrix Rows */}
          {INDEX_GROUPS.map((group) => (
            <div key={group} className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] gap-1">
              {/* Row Label */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-foreground">{group}</span>
                <span className="text-[8px] text-muted-foreground leading-tight text-center">
                  {INDEX_GROUP_LABELS[group]}
                </span>
              </div>
              
              {/* Cells */}
              {LENS_SEGMENTS.map((segment) => {
                const cellKey = `${group}${segment}` as keyof MatrixDistribution;
                const cellData = matrixDistribution[cellKey];
                const isEmpty = cellData.percent === 0;
                
                return (
                  <div 
                    key={cellKey}
                    className={cn(
                      "h-14 rounded-md flex flex-col items-center justify-center px-1 text-center border border-border/10",
                      isEmpty 
                        ? "bg-muted/30" 
                        : getCellColor(group, segment)
                    )}
                  >
                    {!isEmpty && (
                      <>
                        <span className="text-sm font-bold tabular-nums">{cellData.percent}%</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {formatPriceShort(cellData.avgPrice)}
                        </span>
                        <span className="text-[8px] text-muted-foreground/60">
                          {cellData.count} шт
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-emerald-500" />
          <span>Премиум</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-amber-500" />
          <span>Средний</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span>Эконом</span>
        </div>
      </div>
    </Card>
  );
}
