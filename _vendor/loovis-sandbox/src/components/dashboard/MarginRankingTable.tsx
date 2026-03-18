import { useMemo, useState } from 'react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { marginManagersDataByPeriod, MarginManagerRow, MarginMetricValue } from '@/data/marginData';
import { FilterPeriod } from './FilterBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MarginRankingMobile, MarginSortField } from './MarginRankingMobile';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: MarginSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: MarginSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: MarginSortField) => void;
  className?: string;
}

const SortableHeader = ({ field, label, currentSort, onSort, className = '' }: SortableHeaderProps) => {
  const isActive = currentSort.field === field;
  
  return (
    <th 
      onClick={(e) => { e.stopPropagation(); onSort(field); }}
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

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const ForecastIndicator = ({ forecast, large = false }: { forecast: number; large?: boolean }) => {
  const color = forecast >= 100 ? 'text-emerald-600' : forecast >= 80 ? 'text-amber-500' : 'text-red-500';
  const sizeClass = large ? 'text-sm font-medium' : 'text-xs';
  
  return (
    <span className={`${sizeClass} ${color} flex items-center justify-center gap-0.5`}>
      <Activity className={large ? "w-4 h-4" : "w-3 h-3"} />
      {forecast}%
    </span>
  );
};

interface MetricCellProps {
  metric: MarginMetricValue;
  formatValue: (value: number) => string;
  showPercentFirst: boolean;
  suffix?: string;
}

const MetricCell = ({ metric, formatValue, showPercentFirst, suffix = '' }: MetricCellProps) => {
  const absoluteValue = (
    <p className={`font-medium ${showPercentFirst ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}`}>
      {formatValue(metric.value)}{suffix}
    </p>
  );
  
  const percentValue = <ForecastIndicator forecast={metric.forecast} large={showPercentFirst} />;
  
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

const formatCurrency = (value: number) => value.toLocaleString('ru-RU') + ' ₽';

interface MarginRankingTableProps {
  period?: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
}

export function MarginRankingTable({ period = 'month', onManagerClick }: MarginRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });

  const handleSort = (field: MarginSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: MarginManagerRow[] = useMemo(() => {
    const dataSource = marginManagersDataByPeriod[period];
    const managerRows = dataSource.map(manager => ({
      id: manager.id,
      rank: 0,
      name: manager.name,
      role: manager.role,
      avatar: manager.avatar,
      planPercent: manager.planPercent,
      margin: manager.margin,
      revenue: manager.revenue,
      marginPercent: manager.marginPercent,
      lostMargin: manager.lostMargin,
    }));
    
    // Sort
    managerRows.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      if (field === 'name') {
        const result = a.name.localeCompare(b.name, 'ru');
        return direction === 'desc' ? -result : result;
      }
      
      if (['margin', 'revenue'].includes(field)) {
        const metricA = a[field as keyof MarginManagerRow] as MarginMetricValue;
        const metricB = b[field as keyof MarginManagerRow] as MarginMetricValue;
        aVal = showPercentFirst ? metricA.forecast : metricA.value;
        bVal = showPercentFirst ? metricB.forecast : metricB.value;
      } else {
        aVal = a[field as keyof MarginManagerRow] as number;
        bVal = b[field as keyof MarginManagerRow] as number;
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
      <MarginRankingMobile
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
        <h3 className="font-semibold text-foreground">По менеджерам — Маржа</h3>
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
        <table className="w-full border-collapse text-sm min-w-[800px]">
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
                field="margin" 
                label="Маржа" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[120px]"
              />
              <SortableHeader 
                field="revenue" 
                label="Выручка" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[120px]"
              />
              <SortableHeader 
                field="marginPercent" 
                label="Марж-ть" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="lostMargin" 
                label="Потери/Запас" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[120px] bg-amber-100/60 dark:bg-amber-900/30"
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
                {/* Employee */}
                <td className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-5 text-center flex-shrink-0">{row.rank}</span>
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={getManagerAvatar(row.id)} alt={row.name} />
                      <AvatarFallback className="text-xs bg-primary/10">
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
                
                {/* Margin */}
                <MetricCell metric={row.margin} formatValue={formatCurrency} showPercentFirst={showPercentFirst} />
                
                {/* Revenue */}
                <MetricCell metric={row.revenue} formatValue={formatCurrency} showPercentFirst={showPercentFirst} />
                
                {/* Margin percent */}
                <td className="px-3 py-2.5 text-center">
                  <span className="text-sm font-medium">{row.marginPercent}%</span>
                </td>
                
                {/* Lost margin / Reserve */}
                <td className={cn(
                  "px-3 py-2.5 text-center whitespace-nowrap",
                  row.lostMargin >= 0 
                    ? "bg-amber-50/80 dark:bg-amber-900/20"
                    : "bg-emerald-50/80 dark:bg-emerald-900/20"
                )}>
                  <span className={cn(
                    "text-sm font-medium",
                    row.lostMargin >= 0 
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {row.lostMargin >= 0 
                      ? `−${formatCurrency(row.lostMargin)}`
                      : `+${formatCurrency(Math.abs(row.lostMargin))}`
                    }
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
