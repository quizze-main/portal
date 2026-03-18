import { useMemo, useState } from 'react';
import { Activity, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown, MapPin } from 'lucide-react';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { BranchRankingMobile } from './BranchRankingMobile';
import { BranchRankingRow, BranchSortField, DisplayMode } from './BranchRankingCard';
import { cn } from '@/lib/utils';
import { getBranchRankingData } from '@/data/branchMetricsData';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: BranchSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: BranchSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: BranchSortField) => void;
  className?: string;
}

const SortableHeader = ({ field, label, currentSort, onSort, className = '' }: SortableHeaderProps) => {
  const isActive = currentSort.field === field;
  
  return (
    <th 
      onClick={(e) => {
        e.stopPropagation();
        onSort(field);
      }}
      className={`cursor-pointer hover:bg-muted/80 transition-colors select-none ${className}`}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentSort.direction === 'desc' 
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </div>
    </th>
  );
};

type ForecastLabel = 'forecast' | 'deviation';

interface MetricIndicator {
  value: number;
  plan: number;
  forecast: number;
  label: ForecastLabel;
}

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const ForecastIndicator = ({ forecast }: { forecast: number }) => {
  const color = forecast >= 100 ? 'text-emerald-600' : 'text-red-500';
  
  return (
    <span className={`${color} flex items-center justify-center gap-0.5`}>
      <Activity className="w-3 h-3" />
      {forecast}%
    </span>
  );
};

const DeviationIndicator = ({ value }: { value: number }) => {
  const deviation = value - 100;
  
  let color = 'text-muted-foreground';
  if (deviation >= 5) color = 'text-emerald-500';
  else if (deviation <= -5) color = 'text-red-500';
  
  return (
    <span className={`${color} flex items-center justify-center`}>
      {deviation >= 0 ? '+' : ''}{deviation}%
    </span>
  );
};

const MetricForecastIndicator = ({ metric }: { metric: MetricIndicator }) => {
  if (metric.label === 'forecast') {
    return <ForecastIndicator forecast={metric.forecast} />;
  }
  return <DeviationIndicator value={metric.forecast} />;
};

interface MetricCellProps {
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  displayMode: DisplayMode;
  isInverted: boolean;
  suffix?: string;
}

const MetricCell = ({ metric, formatValue, displayMode, isInverted, suffix = '' }: MetricCellProps) => {
  const getContent = () => {
    if (displayMode === 'fact') {
      const factValue = (
        <span className="font-medium text-foreground tabular-nums">
          {formatValue(metric.value)}{suffix}
        </span>
      );
      const percentValue = (
        <MetricForecastIndicator metric={metric} />
      );
      
      return isInverted 
        ? { primary: percentValue, secondary: factValue }
        : { primary: factValue, secondary: percentValue };
    } else {
      const diff = metric.value - metric.plan;
      const factColor = diff >= 0 ? 'text-emerald-600' : 'text-red-500';
      
      if (isInverted) {
        return {
          primary: (
            <span className={`font-medium tabular-nums ${factColor}`}>
              {formatValue(metric.value)}{suffix}
            </span>
          ),
          secondary: (
            <span className="text-muted-foreground tabular-nums">
              {formatValue(metric.plan)}{suffix}
            </span>
          ),
        };
      } else {
        return {
          primary: (
            <span className="font-medium text-foreground tabular-nums">
              {formatValue(metric.plan)}{suffix}
            </span>
          ),
          secondary: (
            <span className={`tabular-nums ${factColor}`}>
              {formatValue(metric.value)}{suffix}
            </span>
          )
        };
      }
    }
  };

  const { primary, secondary } = getContent();
  
  return (
    <td className="px-3 py-2.5 text-center">
      <div className="text-sm leading-tight">{primary}</div>
      <div className="text-[11px] leading-tight">{secondary}</div>
    </td>
  );
};

interface BranchRankingTableProps {
  period?: FilterPeriod;
  selectedBranches: string[];
  onBranchClick?: (branchId: string) => void;
}

export function BranchRankingTable({ period = 'month', selectedBranches, onBranchClick }: BranchRankingTableProps) {
  const isMobile = useIsMobile();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fact');
  const [isInverted, setIsInverted] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  
  const handleSort = (field: BranchSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: BranchRankingRow[] = useMemo(() => {
    const branchData = getBranchRankingData(period);
    
    // Filter by selected branches
    const filteredData = branchData.filter(b => selectedBranches.includes(b.id));
    
    // Sort by selected field
    filteredData.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      if (field === 'name') {
        const result = a.name.localeCompare(b.name, 'ru');
        return direction === 'desc' ? -result : result;
      }
      
      if (['revenueSz', 'revenueZz', 'clientsCount', 'conversion', 'csi', 'avgGlassesPrice', 'margin', 'repairs'].includes(field)) {
        const metricA = a[field as keyof BranchRankingRow] as MetricIndicator;
        const metricB = b[field as keyof BranchRankingRow] as MetricIndicator;
        if (displayMode === 'plan') {
          aVal = metricA.plan;
          bVal = metricB.plan;
        } else {
          aVal = metricA.value;
          bVal = metricB.value;
        }
      } else {
        aVal = a[field as keyof BranchRankingRow] as number;
        bVal = b[field as keyof BranchRankingRow] as number;
      }
      
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return filteredData.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  }, [sortConfig, displayMode, period, selectedBranches]);

  if (isMobile) {
    return (
      <BranchRankingMobile
        rows={rows}
        displayMode={displayMode}
        isInverted={isInverted}
        onDisplayModeChange={setDisplayMode}
        onInvertedChange={setIsInverted}
        onBranchClick={onBranchClick}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden relative isolate">
      <div className="px-4 py-3 border-b bg-muted/60 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Рейтинг филиалов</h3>
        
        {/* Toggle: Прогноз | ⇅ | План */}
        <div className="flex items-center gap-0.5 bg-background border rounded-lg p-0.5">
          <button
            onClick={() => setDisplayMode('fact')}
            className={cn(
              "px-3 h-7 text-xs rounded-md transition-colors",
              displayMode === 'fact' 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            Прогноз
          </button>
          
          <button
            onClick={() => setIsInverted(!isInverted)}
            className={cn(
              "px-2 h-7 rounded-md transition-colors hover:bg-muted",
              isInverted && "bg-muted"
            )}
            title="Поменять местами значения"
          >
            <ArrowUpDown className={cn(
              "w-4 h-4 transition-transform",
              isInverted && "rotate-180"
            )} />
          </button>
          
          <button
            onClick={() => setDisplayMode('plan')}
            className={cn(
              "px-3 h-7 text-xs rounded-md transition-colors",
              displayMode === 'plan' 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            План
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-muted border-b">
              <SortableHeader 
                field="name" 
                label="Филиал" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="sticky left-0 z-10 bg-muted px-2 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap w-[200px] min-w-[200px] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]"
              />
              <SortableHeader 
                field="planPercent" 
                label="% плана" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]"
              />
              <SortableHeader 
                field="revenueSz" 
                label="Выруч. СЗ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[95px]"
              />
              <SortableHeader 
                field="revenueZz" 
                label="Выруч. ЗЗ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[95px]"
              />
              <SortableHeader 
                field="clientsCount" 
                label="Клиенты" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]"
              />
              <SortableHeader 
                field="conversion" 
                label="Конв." 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[60px]"
              />
              <SortableHeader 
                field="csi" 
                label="CSI" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[55px]"
              />
              <SortableHeader 
                field="avgGlassesPrice" 
                label="Ср. стоим." 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[85px]"
              />
              <SortableHeader 
                field="margin" 
                label="Маржа" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="repairs" 
                label="Ремонты" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]"
              />
              <SortableHeader 
                field="lostRevenue" 
                label="Потери" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px]"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                onClick={() => onBranchClick?.(row.id)}
                className={`border-b last:border-b-0 hover:bg-primary/5 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/40'
                }`}
              >
                {/* Branch name with icon */}
                <td className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-5 text-center flex-shrink-0">{row.rank}</span>
                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.type}</p>
                    </div>
                  </div>
                </td>
                
                {/* Plan percent */}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-sm font-bold ${getPercentColor(row.planPercent)}`}>
                    {row.planPercent}%
                  </span>
                </td>
                
                {/* Revenue SZ */}
                <MetricCell metric={row.revenueSz} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Revenue ZZ */}
                <MetricCell metric={row.revenueZz} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Clients */}
                <MetricCell metric={row.clientsCount} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Conversion */}
                <MetricCell metric={row.conversion} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} suffix="%" />
                
                {/* CSI */}
                <MetricCell metric={row.csi} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} suffix="%" />
                
                {/* Avg Glasses Price */}
                <MetricCell metric={row.avgGlassesPrice} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Margin */}
                <MetricCell metric={row.margin} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Repairs */}
                <MetricCell metric={row.repairs} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Lost Revenue / Reserve */}
                <td className="px-3 py-2.5 text-center">
                  {(() => {
                    const isOverPlan = row.planPercent >= 100;
                    const textColor = isOverPlan ? 'text-emerald-600' : 'text-red-600';
                    const bgColor = isOverPlan ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20';
                    
                    return (
                      <div className={`inline-flex flex-col items-center px-2 py-1 rounded ${bgColor}`}>
                        <span className="text-[10px] text-muted-foreground">
                          {isOverPlan ? 'Запас' : 'Потери'}
                        </span>
                        <span className={`text-sm font-medium ${textColor}`}>
                          {isOverPlan ? '+' : '−'}{formatNumber(Math.abs(row.lostRevenue))}
                        </span>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
