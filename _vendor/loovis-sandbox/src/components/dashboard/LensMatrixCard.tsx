import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterPeriod } from './FilterBar';
import { 
  lensMatrixDataByPeriod, 
  LensSegment, 
  IndexGroup,
  LENS_SEGMENTS, 
  INDEX_GROUPS,
  INDEX_GROUP_LABELS,
  aggregateLensMatrix,
  makeGroupCellKey,
  MatrixDistribution
} from '@/data/periodData';
import { ChevronRight, Glasses } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LensMatrixCardProps {
  period: FilterPeriod;
}

// Color coding by cell position (group + segment combination)
// Premium (green): XA, YA, XB
// Medium (orange): ZA, YB, XC
// Economy (red): all others (ZB, YC, YD, ZC, ZD, XD)
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

// Calculate manager's color bar segments from matrixDistribution
const calculateColorBarSegments = (dist: MatrixDistribution) => {
  // Premium (green): XA, YA, XB
  const greenPercent = dist.XA.percent + dist.YA.percent + dist.XB.percent;
  // Medium (orange): ZA, YB, XC
  const orangePercent = dist.ZA.percent + dist.YB.percent + dist.XC.percent;
  // Economy (red): all others
  const redPercent = dist.ZB.percent + dist.YC.percent + dist.YD.percent + dist.ZC.percent + dist.ZD.percent + dist.XD.percent;
  
  return { greenPercent, orangePercent, redPercent };
};

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value) + ' ₽';
};

// Compact price format for mobile matrix cells (12800 → "13к")
const formatPriceShort = (value: number): string => {
  if (value >= 10000) {
    return Math.round(value / 1000) + 'к';
  }
  return value.toLocaleString('ru-RU');
};

// Aggregate X+Y+Z for each segment (A/B/C/D)
const aggregateBySegment = (dist: MatrixDistribution): Record<LensSegment, number> => ({
  A: dist.XA.percent + dist.YA.percent + dist.ZA.percent,
  B: dist.XB.percent + dist.YB.percent + dist.ZB.percent,
  C: dist.XC.percent + dist.YC.percent + dist.ZC.percent,
  D: dist.XD.percent + dist.YD.percent + dist.ZD.percent,
});

export const LensMatrixCard = ({ period }: LensMatrixCardProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedManagerIds, setExpandedManagerIds] = useState<Set<string>>(new Set());
  const data = lensMatrixDataByPeriod[period];
  
  // Aggregate matrix into 3×4 groups
  const aggregatedMatrix = aggregateLensMatrix(data.matrix);

  // Get top 3 aggregated cells by percentage
  const top3Cells = Object.entries(aggregatedMatrix)
    .filter(([_, cell]) => cell.percent > 0)
    .sort((a, b) => b[1].percent - a[1].percent)
    .slice(0, 3);

  // All managers sorted by average lens price (descending)
  const sortedManagers = [...data.managers].sort((a, b) => b.avgLensPrice - a.avgLensPrice);

  const planPercent = Math.round((data.avgLensPrice / data.planAvgPrice) * 100);

  return (
    <div className="border-b border-border/30">
      {/* Compact Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 px-3 hover:bg-secondary/30 transition-colors text-left"
      >
        {/* Mobile: vertical layout */}
        <div className="sm:hidden space-y-2">
          {/* Row 1: chevron + icon + full name */}
          <div className="flex items-center gap-2">
            <ChevronRight 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                isOpen && "rotate-90"
              )} 
            />
            <Glasses className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium">Индекс линз</span>
          </div>
          {/* Row 2: progress bar + value + percent */}
          <div className="flex items-center gap-2 pl-6">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(planPercent, 100)}%` }}
                className={cn(
                  "h-full rounded-full transition-all",
                  planPercent >= 100 ? "bg-emerald-500" : planPercent >= 80 ? "bg-amber-500" : "bg-red-500"
                )}
              />
            </div>
            <span className="text-sm font-bold tabular-nums shrink-0">
              {formatCurrencyFull(data.avgLensPrice)}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs justify-center tabular-nums shrink-0",
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

        {/* Desktop: horizontal grid */}
        <div className="hidden sm:grid grid-cols-[20px_20px_1fr_auto_80px_50px] gap-2 items-center">
          <ChevronRight 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-90"
            )} 
          />
          <Glasses className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate">Индекс линз</span>
          
          {/* Top 3 cells chips - desktop only */}
          <div className="flex gap-1.5 overflow-hidden">
            {top3Cells.slice(0, 2).map(([key, cellData]) => (
              <span 
                key={key}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap",
                  getCellColor(cellData.group, cellData.segment)
                )}
              >
                {cellData.group}/{cellData.segment} {cellData.percent}%
              </span>
            ))}
          </div>
          
          {/* Average price */}
          <span className="text-xs text-muted-foreground text-right tabular-nums">
            {formatCurrencyFull(data.avgLensPrice)}
          </span>
          
          {/* Plan percent badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs justify-center tabular-nums",
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
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-3 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Matrix Grid - 3×4 with grouped indices */}
          <div className="overflow-x-auto -mx-3 px-3">
            <div className="min-w-[360px] space-y-1">
              {/* Column Headers (Segments A/B/C/D) */}
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
              
              {/* Matrix Rows (3 grouped rows: X, Y, Z) */}
              {INDEX_GROUPS.map((group) => (
                <div key={group} className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] gap-1">
                  {/* Row Label - Group with indices range */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-foreground">{group}</span>
                    <span className="text-[8px] text-muted-foreground leading-tight text-center">{INDEX_GROUP_LABELS[group]}</span>
                  </div>
                  
                  {/* Aggregated Cells - Centered vertical stack */}
                  {LENS_SEGMENTS.map((segment) => {
                    const cellKey = makeGroupCellKey(group, segment);
                    const cellData = aggregatedMatrix[cellKey];
                    const isEmpty = cellData.percent === 0;
                    
                    return (
                      <div 
                        key={cellKey}
                        className={cn(
                          "h-14 rounded-md flex flex-col items-center justify-center px-1 text-center transition-all border border-border/10",
                          isEmpty 
                            ? "bg-muted/30" 
                            : cn(getCellColor(group, segment), "hover:scale-[1.02] hover:shadow-sm cursor-pointer")
                        )}
                      >
                        {!isEmpty && (
                          <>
                            {/* Percent - prominent */}
                            <span className="text-sm font-bold tabular-nums">{cellData.percent}%</span>
                            {/* Price - compact */}
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {formatPriceShort(cellData.avgPrice)}
                            </span>
                            {/* Count - small */}
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


          {/* Manager profiles with expandable ABCD×XYZ matrix */}
          {sortedManagers.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground font-medium">Профили менеджеров:</div>
              {sortedManagers.map((manager) => {
                const isExpanded = expandedManagerIds.has(manager.id);
                const managerPlanPercent = Math.round((manager.avgLensPrice / data.planAvgPrice) * 100);
                
                return (
                  <div 
                    key={manager.id}
                    className="rounded bg-secondary/20 overflow-hidden"
                  >
                    {/* Manager Header - Toggle */}
                    <button
                      onClick={() => {
                        setExpandedManagerIds(prev => {
                          const next = new Set(prev);
                          if (next.has(manager.id)) {
                            next.delete(manager.id);
                          } else {
                            next.add(manager.id);
                          }
                          return next;
                        });
                      }}
                      className="w-full py-2 px-2 hover:bg-secondary/40 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-90"
                            )} 
                          />
                          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-[10px] font-medium">{manager.name.charAt(0)}</span>
                          </div>
                          <span className="text-xs font-medium">{manager.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            Ср. {formatCurrencyFull(manager.avgLensPrice)}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] tabular-nums px-1.5",
                              managerPlanPercent >= 100 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                                : managerPlanPercent >= 80 
                                  ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                                  : "bg-red-500/10 text-red-600 border-red-500/30"
                            )}
                          >
                            {managerPlanPercent}%
                          </Badge>
                        </div>
                      </div>
                      {/* Color bar showing distribution by color groups */}
                      {(() => {
                        const bars = calculateColorBarSegments(manager.matrixDistribution);
                        return (
                          <div className="flex h-1.5 rounded-full overflow-hidden mx-2 mt-1">
                            {bars.greenPercent > 0 && (
                              <div style={{ width: `${bars.greenPercent}%` }} className="bg-emerald-500" />
                            )}
                            {bars.orangePercent > 0 && (
                              <div style={{ width: `${bars.orangePercent}%` }} className="bg-amber-500" />
                            )}
                            {bars.redPercent > 0 && (
                              <div style={{ width: `${bars.redPercent}%` }} className="bg-red-500" />
                            )}
                          </div>
                        );
                      })()}
                    </button>
                    
                    {/* Expanded Manager Matrix */}
                    {isExpanded && (
                      <div className="px-2 pb-3 pt-1 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {/* Manager's personal 3×4 matrix */}
                        <div className="overflow-x-auto -mx-2 px-2">
                          <div className="min-w-[320px] space-y-1">
                            {/* Column Headers (Segments A/B/C/D) */}
                            <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-1">
                              <div /> {/* Empty corner */}
                              {LENS_SEGMENTS.map((segment) => (
                                <div 
                                  key={segment} 
                                  className="text-[10px] text-center font-bold py-0.5 rounded-t bg-muted/50 text-muted-foreground"
                                >
                                  {segment}
                                </div>
                              ))}
                            </div>
                            
                            {/* Matrix Rows (X, Y, Z) */}
                            {INDEX_GROUPS.map((group) => (
                              <div key={group} className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-1">
                                {/* Row Label */}
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-xs font-bold text-foreground">{group}</span>
                                  <span className="text-[7px] text-muted-foreground leading-tight text-center">{INDEX_GROUP_LABELS[group]}</span>
                                </div>
                                
                                {/* Cells from manager's matrixDistribution */}
                                {LENS_SEGMENTS.map((segment) => {
                                  const cellKey = `${group}${segment}` as keyof MatrixDistribution;
                                  const cellData = manager.matrixDistribution[cellKey];
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
                                          {/* Percent - prominent */}
                                          <span className="text-sm font-bold tabular-nums">{cellData.percent}%</span>
                                          {/* Price - compact */}
                                          <span className="text-[10px] text-muted-foreground tabular-nums">
                                            {formatPriceShort(cellData.avgPrice)}
                                          </span>
                                          {/* Count - small */}
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
                        
                        {/* Link to manager detail page */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/manager/${manager.id}`);
                          }}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Подробнее о сотруднике
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
