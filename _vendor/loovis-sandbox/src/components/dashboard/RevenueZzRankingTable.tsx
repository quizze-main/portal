import { useMemo, useState } from 'react';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { managersData } from '@/data/mockData';
import { managersDataByPeriod, revenueZzManagersDataByPeriod } from '@/data/periodData';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { RevenueZzRankingMobile } from './RevenueZzRankingMobile';
import { RevenueZzRankingRow, RevenueZzSortField } from './RevenueZzRankingCard';
import { getManagerAvatar } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: RevenueZzSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: RevenueZzSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: RevenueZzSortField) => void;
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
  forecast: number;
  label: ForecastLabel;
}

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

// Индикатор прогноза — красный если < 100%, зелёный если >= 100%
const ForecastIndicator = ({ forecast, large = false }: { forecast: number; large?: boolean }) => {
  const color = forecast >= 100 ? 'text-emerald-600' : 'text-red-500';
  const sizeClass = large ? 'text-sm font-medium' : 'text-xs';
  
  return (
    <span className={`${sizeClass} ${color} flex items-center justify-center gap-0.5`}>
      <Activity className={large ? "w-4 h-4" : "w-3 h-3"} />
      {forecast}%
    </span>
  );
};

// Индикатор отклонения (для времени) — с подсветкой
const DeviationIndicator = ({ value, large = false, inverted = false }: { value: number; large?: boolean; inverted?: boolean }) => {
  const deviation = value - 100;
  
  let color = 'text-muted-foreground';
  // For inverted metrics (like avg closing days), lower is better
  if (inverted) {
    if (deviation <= -5) color = 'text-emerald-500';
    else if (deviation >= 5) color = 'text-red-500';
  } else {
    if (deviation >= 5) color = 'text-emerald-500';
    else if (deviation <= -5) color = 'text-red-500';
  }
  
  const sizeClass = large ? 'text-sm font-medium' : 'text-xs';
  
  return (
    <span className={`${sizeClass} ${color} flex items-center justify-center`}>
      {deviation >= 0 ? '+' : ''}{deviation}%
    </span>
  );
};

// Универсальный индикатор
const MetricForecastIndicator = ({ metric, large = false, inverted = false }: { metric: MetricIndicator; large?: boolean; inverted?: boolean }) => {
  if (metric.label === 'forecast') {
    return <ForecastIndicator forecast={metric.forecast} large={large} />;
  }
  return <DeviationIndicator value={metric.forecast} large={large} inverted={inverted} />;
};

// Универсальная ячейка метрики
interface MetricCellProps {
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  showPercentFirst: boolean;
  suffix?: string;
  inverted?: boolean;
}

const MetricCell = ({ metric, formatValue, showPercentFirst, suffix = '', inverted = false }: MetricCellProps) => {
  const absoluteValue = (
    <p className={`font-medium ${showPercentFirst ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}`}>
      {formatValue(metric.value)}{suffix}
    </p>
  );
  
  const percentValue = (
    <MetricForecastIndicator metric={metric} large={showPercentFirst} inverted={inverted} />
  );
  
  return (
    <td className="px-3 py-2.5 text-center">
      {showPercentFirst ? (
        <>
          {percentValue}
          {absoluteValue}
        </>
      ) : (
        <>
          {absoluteValue}
          {percentValue}
        </>
      )}
    </td>
  );
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

interface RevenueZzRankingTableProps {
  period?: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
}

export function RevenueZzRankingTable({ period = 'month', onManagerClick }: RevenueZzRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  
  const handleSort = (field: RevenueZzSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: RevenueZzRankingRow[] = useMemo(() => {
    const dataSource = revenueZzManagersDataByPeriod[period];
    
    const managerRows = dataSource.map(manager => {
      const planPercent = manager.revenueZz.plan > 0 
        ? Math.round((manager.revenueZz.value / manager.revenueZz.plan) * 100) 
        : 0;
      
      return {
        id: manager.id,
        rank: 0,
        name: manager.name,
        role: manager.role,
        avatar: manager.avatar,
        planPercent,
        revenueZz: {
          value: manager.revenueZz.value,
          forecast: planPercent,
          label: 'forecast' as const,
        },
        closingsCount: {
          value: manager.closingsCount.value,
          forecast: manager.closingsCount.plan > 0 
            ? Math.round((manager.closingsCount.value / manager.closingsCount.plan) * 100) 
            : 0,
          label: 'forecast' as const,
        },
        avgClosingDays: {
          value: manager.avgClosingDays.value,
          forecast: manager.avgClosingDays.plan > 0 
            ? Math.round((manager.avgClosingDays.value / manager.avgClosingDays.plan) * 100) 
            : 0,
          label: 'deviation' as const,
        },
        onTimePercent: {
          value: manager.onTimePercent.value,
          forecast: manager.onTimePercent.plan > 0 
            ? Math.round((manager.onTimePercent.value / manager.onTimePercent.plan) * 100) 
            : 0,
          label: 'deviation' as const,
        },
        lostRevenue: manager.lostRevenue,
      };
    });
    
    // Сортировка по выбранному полю
    managerRows.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      if (field === 'name') {
        const result = a.name.localeCompare(b.name, 'ru');
        return direction === 'desc' ? -result : result;
      }
      
      // Для метрик с MetricIndicator — сортируем по forecast или value в зависимости от режима
      if (['revenueZz', 'closingsCount', 'avgClosingDays', 'onTimePercent'].includes(field)) {
        const metricA = a[field as keyof RevenueZzRankingRow] as MetricIndicator;
        const metricB = b[field as keyof RevenueZzRankingRow] as MetricIndicator;
        aVal = showPercentFirst ? metricA.forecast : metricA.value;
        bVal = showPercentFirst ? metricB.forecast : metricB.value;
      } else {
        aVal = a[field as keyof RevenueZzRankingRow] as number;
        bVal = b[field as keyof RevenueZzRankingRow] as number;
      }
      
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return managerRows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  }, [sortConfig, showPercentFirst, period]);

  if (isMobile) {
    return (
      <RevenueZzRankingMobile
        rows={rows}
        showPercentFirst={showPercentFirst}
        onToggleView={() => setShowPercentFirst(!showPercentFirst)}
        onManagerClick={onManagerClick}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden relative isolate">
      <div className="px-4 py-3 border-b bg-muted/60 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Рейтинг менеджеров по закрытиям</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPercentFirst(!showPercentFirst)}
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {showPercentFirst ? '% → Значения' : 'Значения → %'}
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[650px]">
          <thead>
            <tr className="bg-muted border-b">
              <SortableHeader 
                field="name" 
                label="Сотрудник" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="sticky left-0 z-10 bg-muted px-2 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap w-[170px] min-w-[170px] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]"
              />
              <SortableHeader 
                field="planPercent" 
                label="% плана" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]"
              />
              <SortableHeader 
                field="revenueZz" 
                label="Выручка ЗЗ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px] bg-cyan-50/50 dark:bg-cyan-900/20"
              />
              <SortableHeader 
                field="closingsCount" 
                label="Закрытий" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="avgClosingDays" 
                label="Ср. время" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[85px]"
              />
              <SortableHeader 
                field="onTimePercent" 
                label="% в срок" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="lostRevenue" 
                label="Потери" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px] bg-amber-100/60 dark:bg-amber-900/30"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                onClick={() => onManagerClick?.(row.id)}
                className={`border-b last:border-b-0 hover:bg-primary/5 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/40'
                }`}
              >
                {/* Combined: Rank + Employee */}
                <td className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-5 text-center flex-shrink-0">{row.rank}</span>
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={getManagerAvatar(row.id)} alt={row.name} />
                      <AvatarFallback className="text-xs bg-cyan-500/10 text-cyan-600">
                        {getInitials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.role}</p>
                    </div>
                  </div>
                </td>
                
                {/* Plan percent */}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-sm font-bold ${getPercentColor(row.planPercent)}`}>
                    {row.planPercent}%
                  </span>
                </td>
                
                {/* Revenue ZZ - Cyan accent */}
                <td className="px-3 py-2.5 text-center bg-cyan-50/30 dark:bg-cyan-900/10">
                  <p className={`font-medium ${showPercentFirst ? 'text-xs text-muted-foreground' : 'text-sm text-cyan-700 dark:text-cyan-400'}`}>
                    {formatNumber(row.revenueZz.value)}
                  </p>
                  <MetricForecastIndicator metric={row.revenueZz} large={showPercentFirst} />
                </td>
                
                {/* Closings Count */}
                <MetricCell metric={row.closingsCount} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix=" шт" />
                
                {/* Avg Closing Days - inverted (lower is better) */}
                <MetricCell metric={row.avgClosingDays} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix=" дн" inverted />
                
                {/* On Time Percent */}
                <MetricCell metric={row.onTimePercent} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix="%" />
                
                {/* Lost revenue */}
                <td className="px-3 py-2.5 text-center bg-amber-50/80 dark:bg-amber-900/20 whitespace-nowrap">
                {row.planPercent >= 100 ? (
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      +{formatNumber(Math.abs(row.lostRevenue))}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      −{formatNumber(Math.abs(row.lostRevenue))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
