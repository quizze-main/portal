import { useState, useMemo } from 'react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ConversionRankingMobile, type ConversionSortField } from './ConversionRankingMobile';
import type { ConversionManagerRow } from '@/data/conversionData';
import { conversionManagersDataByPeriod } from '@/data/conversionData';
import { FilterPeriod } from './FilterBar';

interface ConversionRankingTableProps {
  period: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: ConversionSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: ConversionSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: ConversionSortField) => void;
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
  value: number;
  plan: number;
  showPercentFirst: boolean;
}

const MetricCell = ({ value, plan, showPercentFirst }: MetricCellProps) => {
  const percent = Math.round((value / plan) * 100);
  
  const absoluteValue = (
    <p className={`font-medium ${showPercentFirst ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}`}>
      {value}%
    </p>
  );
  
  const percentValue = <ForecastIndicator forecast={percent} large={showPercentFirst} />;
  
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

const formatCurrency = (value: number): string => {
  return Math.abs(value).toLocaleString('ru-RU');
};

export interface ExtendedConversionRow extends ConversionManagerRow {
  rank: number;
  flSalePercent: number;
  repairCheckPercent: number;
  repairSalePercent: number;
  flCheckPercent: number;
  checkSalePercent: number;
}

export function ConversionRankingTable({ period, onManagerClick, className = '' }: ConversionRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'overall', direction: 'desc' });
  
  const rawData = conversionManagersDataByPeriod[period] || conversionManagersDataByPeriod['month'];
  
  const handleSort = (field: ConversionSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Calculate percentages and create rows
  const rows: ExtendedConversionRow[] = useMemo(() => {
    const managerRows = rawData.map((m) => {
      const flSalePercent = Math.round((m.flSale.current / m.flSale.plan) * 100);
      const repairCheckPercent = Math.round((m.repairCheck.current / m.repairCheck.plan) * 100);
      const repairSalePercent = Math.round((m.repairSale.current / m.repairSale.plan) * 100);
      const flCheckPercent = Math.round((m.flCheck.current / m.flCheck.plan) * 100);
      const checkSalePercent = Math.round((m.checkSale.current / m.checkSale.plan) * 100);
      
      return {
        ...m,
        rank: 0,
        flSalePercent,
        repairCheckPercent,
        repairSalePercent,
        flCheckPercent,
        checkSalePercent,
      };
    });
    
    // Sort by selected field
    managerRows.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      switch (field) {
        case 'flSale':
          aVal = a.flSalePercent;
          bVal = b.flSalePercent;
          break;
        case 'repairCheck':
          aVal = a.repairCheckPercent;
          bVal = b.repairCheckPercent;
          break;
        case 'repairSale':
          aVal = a.repairSalePercent;
          bVal = b.repairSalePercent;
          break;
        case 'flCheck':
          aVal = a.flCheckPercent;
          bVal = b.flCheckPercent;
          break;
        case 'checkSale':
          aVal = a.checkSalePercent;
          bVal = b.checkSalePercent;
          break;
        case 'lostRevenue':
          aVal = a.lostRevenue;
          bVal = b.lostRevenue;
          return direction === 'desc' ? aVal - bVal : bVal - aVal; // Reverse for loss
        default:
          aVal = a.overallPercent;
          bVal = b.overallPercent;
      }
      
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return managerRows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  }, [rawData, sortConfig]);
  
  if (isMobile) {
    return (
      <ConversionRankingMobile
        rows={rows}
        sortField={sortConfig.field}
        onSort={handleSort}
        onManagerClick={onManagerClick}
      />
    );
  }
  
  return (
    <div className={cn("bg-card rounded-xl border shadow-sm overflow-hidden relative isolate", className)}>
      <div className="px-4 py-3 border-b bg-muted/60 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Рейтинг менеджеров по конверсиям</h3>
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
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead>
            <tr className="bg-muted border-b">
              <SortableHeader 
                field="overall" 
                label="Сотрудник" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="sticky left-0 z-10 bg-muted px-2 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap w-[170px] min-w-[170px] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]"
              />
              <SortableHeader 
                field="overall" 
                label="% плана" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[70px]"
              />
              <SortableHeader 
                field="flSale" 
                label="ФЛ→Прод" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="repairCheck" 
                label="Рем→Пров" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="repairSale" 
                label="Рем→Прод" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="flCheck" 
                label="ФЛ→Пров" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="checkSale" 
                label="Пров→Прод" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="lostRevenue" 
                label="Потери" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
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
                {/* Rank + Employee */}
                <td className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-5 text-center flex-shrink-0">{row.rank}</span>
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={getManagerAvatar(row.id)} alt={row.name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
                  <span className={`text-sm font-bold ${getPercentColor(row.overallPercent)}`}>
                    {row.overallPercent}%
                  </span>
                </td>
                
                {/* FL -> Sale */}
                <MetricCell 
                  value={row.flSale.current} 
                  plan={row.flSale.plan} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* Repair -> Check */}
                <MetricCell 
                  value={row.repairCheck.current} 
                  plan={row.repairCheck.plan} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* Repair -> Sale */}
                <MetricCell 
                  value={row.repairSale.current} 
                  plan={row.repairSale.plan} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* FL -> Check */}
                <MetricCell 
                  value={row.flCheck.current} 
                  plan={row.flCheck.plan} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* Check -> Sale */}
                <MetricCell 
                  value={row.checkSale.current} 
                  plan={row.checkSale.plan} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* Lost Revenue */}
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  {row.lostRevenue > 0 ? (
                    <span className="text-sm font-medium text-destructive">
                      −{formatCurrency(row.lostRevenue)} ₽
                    </span>
                  ) : row.lostRevenue < 0 ? (
                    <span className="text-sm font-medium text-emerald-600">
                      +{formatCurrency(row.lostRevenue)} ₽
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      0 ₽
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
