import { useState, useMemo } from 'react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MissionRankingMobile, type MissionSortField } from './MissionRankingMobile';
import type { MissionManagerRow } from './MissionRankingCard';
import { missionManagersDataByPeriod } from '@/data/periodData';
import { FilterPeriod } from './FilterBar';

interface MissionRankingTableProps {
  period: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: MissionSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: MissionSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: MissionSortField) => void;
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
  percent: number;
  showPercentFirst: boolean;
  suffix?: string;
}

const MetricCell = ({ value, percent, showPercentFirst, suffix = '' }: MetricCellProps) => {
  const absoluteValue = (
    <p className={`font-medium ${showPercentFirst ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}`}>
      {value}{suffix}
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

export function MissionRankingTable({ period, onManagerClick, className = '' }: MissionRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'overall', direction: 'desc' });
  
  const rawData = missionManagersDataByPeriod[period] || missionManagersDataByPeriod['month'];
  
  const handleSort = (field: MissionSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  interface ExtendedMissionRow extends MissionManagerRow {
    role: string;
    diagPercent: number;
    lcaPercent: number;
    childrenPercent: number;
    convPercent: number;
  }

  // Calculate overall percent and create rows
  const rows: ExtendedMissionRow[] = useMemo(() => {
    const managerRows = rawData.map((m) => {
      const diagPercent = Math.round((m.diagnostics.current / m.diagnostics.plan) * 100);
      const lcaPercent = Math.round((m.lca.current / m.lca.plan) * 100);
      const childrenPercent = Math.round((m.children.current / m.children.plan) * 100);
      const convPercent = Math.round((m.conversion.current / m.conversion.plan) * 100);
      const overallPercent = Math.round((diagPercent + lcaPercent + childrenPercent + convPercent) / 4);
      
      return {
        id: m.id,
        name: m.name,
        role: m.role || 'Консультант',
        avatar: m.avatar,
        rank: 0,
        diagnostics: m.diagnostics,
        lca: m.lca,
        children: m.children,
        conversion: m.conversion,
        overallPercent,
        diagPercent,
        lcaPercent,
        childrenPercent,
        convPercent,
      };
    });
    
    // Sort by selected field
    managerRows.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      switch (field) {
        case 'diagnostics':
          aVal = a.diagPercent;
          bVal = b.diagPercent;
          break;
        case 'lca':
          aVal = a.lcaPercent;
          bVal = b.lcaPercent;
          break;
        case 'children':
          aVal = a.childrenPercent;
          bVal = b.childrenPercent;
          break;
        case 'conversion':
          aVal = a.convPercent;
          bVal = b.convPercent;
          break;
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
      <MissionRankingMobile
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
        <h3 className="font-semibold text-foreground">Рейтинг менеджеров по миссии</h3>
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
                field="diagnostics" 
                label="Диагностики" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px]"
              />
              <SortableHeader 
                field="lca" 
                label="ЛКА" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="children" 
                label="Детские" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="conversion" 
                label="Конверсия" 
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
                
                {/* Diagnostics */}
                <MetricCell 
                  value={row.diagnostics.current} 
                  percent={row.diagPercent} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* LCA */}
                <MetricCell 
                  value={row.lca.current} 
                  percent={row.lcaPercent} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* Children */}
                <MetricCell 
                  value={row.children.current} 
                  percent={row.childrenPercent} 
                  showPercentFirst={showPercentFirst} 
                />
                
                {/* Conversion */}
                <MetricCell 
                  value={row.conversion.current} 
                  percent={row.convPercent} 
                  showPercentFirst={showPercentFirst} 
                  suffix="%"
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
