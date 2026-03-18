import { useMemo, useState } from 'react';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { clientsRankingByPeriod } from '@/data/periodData';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClientsRankingMobile } from './ClientsRankingMobile';
import { ClientsRankingRow, ClientsSortField, MetricValue } from './ClientsRankingCard';
import { getManagerAvatar } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: ClientsSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: ClientsSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: ClientsSortField) => void;
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

// Forecast indicator with activity icon
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

// Metric cell component
interface MetricCellProps {
  metric: MetricValue;
  showPercentFirst: boolean;
  suffix?: string;
}

const MetricCell = ({ metric, showPercentFirst, suffix = '' }: MetricCellProps) => {
  const absoluteValue = (
    <p className={`font-medium ${showPercentFirst ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}`}>
      {metric.value}{suffix}
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

interface ClientsRankingTableProps {
  period?: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
}

export function ClientsRankingTable({ period = 'month', onManagerClick }: ClientsRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  
  const handleSort = (field: ClientsSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: ClientsRankingRow[] = useMemo(() => {
    const data = clientsRankingByPeriod[period];
    
    // Transform data to new format with MetricValue
    const managerRows: ClientsRankingRow[] = data.map(row => ({
      id: row.id,
      rank: 0,
      name: row.name,
      avatar: row.avatar,
      planPercent: row.planPercent,
      total: {
        value: row.total.value,
        forecast: Math.round((row.total.value / row.total.plan) * 100)
      },
      newClients: {
        value: row.newClients.value,
        forecast: Math.round((row.newClients.value / row.newClients.plan) * 100)
      },
      repeatClients: {
        value: row.repeatClients.value,
        forecast: Math.round((row.repeatClients.value / row.repeatClients.plan) * 100)
      },
      oldCheck: {
        value: row.oldCheck.value,
        forecast: Math.round((row.oldCheck.value / row.oldCheck.plan) * 100)
      },
      lcaInstallations: {
        value: row.lcaInstallations.value,
        forecast: Math.round((row.lcaInstallations.value / row.lcaInstallations.plan) * 100)
      },
      lostRevenue: (row as any).lostRevenue || Math.round((100 - row.planPercent) * 1500),
    }));
    
    // Sort
    managerRows.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      if (field === 'name') {
        const result = a.name.localeCompare(b.name, 'ru');
        return direction === 'desc' ? -result : result;
      }
      
      if (['total', 'newClients', 'repeatClients', 'oldCheck', 'lcaInstallations'].includes(field)) {
        const metricA = a[field as keyof ClientsRankingRow] as MetricValue;
        const metricB = b[field as keyof ClientsRankingRow] as MetricValue;
        aVal = showPercentFirst ? metricA.forecast : metricA.value;
        bVal = showPercentFirst ? metricB.forecast : metricB.value;
      } else {
        aVal = a[field as keyof ClientsRankingRow] as number;
        bVal = b[field as keyof ClientsRankingRow] as number;
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
      <ClientsRankingMobile
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
        <h3 className="font-semibold text-foreground">Рейтинг менеджеров</h3>
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
        <table className="w-full border-collapse text-sm min-w-[700px]">
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
                field="total" 
                label="Всего ФЛ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="newClients" 
                label="Новые" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="repeatClients" 
                label="Повторные" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="oldCheck" 
                label=">6 мес." 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="lcaInstallations" 
                label="LCA уст." 
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
                {/* Employee */}
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
                    </div>
                  </div>
                </td>
                
                {/* Plan percent */}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-sm font-bold ${getPercentColor(row.planPercent)}`}>
                    {row.planPercent}%
                  </span>
                </td>
                
                {/* Metrics */}
                <MetricCell metric={row.total} showPercentFirst={showPercentFirst} />
                <MetricCell metric={row.newClients} showPercentFirst={showPercentFirst} />
                <MetricCell metric={row.repeatClients} showPercentFirst={showPercentFirst} />
                <MetricCell metric={row.oldCheck} showPercentFirst={showPercentFirst} />
                <MetricCell metric={row.lcaInstallations} showPercentFirst={showPercentFirst} />
                
                {/* Lost revenue */}
                <td className="px-3 py-2.5 text-center bg-amber-50/80 dark:bg-amber-900/20 whitespace-nowrap">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    −{formatNumber(row.lostRevenue)}
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
