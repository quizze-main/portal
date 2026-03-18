import { useMemo, useState } from 'react';
import { Activity, ArrowUpDown, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { managersData } from '@/data/mockData';
import { managersDataByPeriod } from '@/data/periodData';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { RevenueSzRankingMobile } from './RevenueSzRankingMobile';
import { RevenueSzRankingRow, RevenueSzSortField } from './RevenueSzRankingCard';
import { getManagerAvatar } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: RevenueSzSortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: RevenueSzSortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: RevenueSzSortField) => void;
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

// Определяем какие метрики показывают прогноз, а какие отклонение
const metricLabels: Record<string, ForecastLabel> = {
  'revenue_sz': 'forecast',
  'orders_count': 'forecast',
  'clients_count': 'forecast',
  'avg_cost': 'deviation',
  'conversion': 'deviation',
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

// Индикатор прогноза (для Выручки, Заказов, Клиентов) — красный если < 100%, зелёный если >= 100%
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

// Индикатор отклонения (для Конверсии, Ср. стоимости) — с подсветкой
const DeviationIndicator = ({ value, large = false }: { value: number; large?: boolean }) => {
  const deviation = value - 100;
  
  let color = 'text-muted-foreground';
  if (deviation >= 5) color = 'text-emerald-500';
  else if (deviation <= -5) color = 'text-red-500';
  
  const sizeClass = large ? 'text-sm font-medium' : 'text-xs';
  
  return (
    <span className={`${sizeClass} ${color} flex items-center justify-center`}>
      {deviation >= 0 ? '+' : ''}{deviation}%
    </span>
  );
};

// Универсальный индикатор
const MetricForecastIndicator = ({ metric, large = false }: { metric: MetricIndicator; large?: boolean }) => {
  if (metric.label === 'forecast') {
    return <ForecastIndicator forecast={metric.forecast} large={large} />;
  }
  return <DeviationIndicator value={metric.forecast} large={large} />;
};

// Универсальная ячейка метрики
interface MetricCellProps {
  metric: MetricIndicator;
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
  
  const percentValue = (
    <MetricForecastIndicator metric={metric} large={showPercentFirst} />
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

interface RevenueSzRankingTableProps {
  period?: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
}

export function RevenueSzRankingTable({ period = 'month', onManagerClick }: RevenueSzRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  
  const handleSort = (field: RevenueSzSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: RevenueSzRankingRow[] = useMemo(() => {
    const dataSource = managersDataByPeriod[period] || managersData;
    const managers = Object.values(dataSource);
    
    const managerRows = managers.map(manager => {
      const metrics = manager.metricsLevel1;
      
      // Calculate plan percent based on revenue_sz forecast
      const revenueSzMetric = metrics.find(m => m.id === 'revenue_sz');
      const planPercent = revenueSzMetric?.forecast || 0;
      
      const getMetric = (id: string): MetricIndicator => {
        const m = metrics.find(metric => metric.id === id);
        return {
          value: m?.current || 0,
          forecast: m?.forecast || 0,
          label: metricLabels[id] || 'forecast',
        };
      };
      
      // Get orders count from created_orders or calculate
      const ordersCountMetric = metrics.find(m => m.id === 'created_orders' || m.id === 'orders_count');
      const ordersCount: MetricIndicator = ordersCountMetric 
        ? {
            value: ordersCountMetric.current,
            forecast: ordersCountMetric.forecast,
            label: 'forecast'
          }
        : {
            value: Math.round(getMetric('revenue_sz').value / 15000), // approximate from revenue
            forecast: planPercent,
            label: 'forecast'
          };
      
      return {
        id: manager.id,
        rank: 0,
        name: manager.name,
        role: manager.role,
        avatar: manager.avatar,
        planPercent: Math.round(planPercent),
        revenueSz: getMetric('revenue_sz'),
        ordersCount,
        clientsCount: getMetric('clients_count'),
        avgCost: getMetric('avg_glasses'),
        conversion: getMetric('conversion'),
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
      if (['revenueSz', 'ordersCount', 'clientsCount', 'avgCost', 'conversion'].includes(field)) {
        const metricA = a[field as keyof RevenueSzRankingRow] as MetricIndicator;
        const metricB = b[field as keyof RevenueSzRankingRow] as MetricIndicator;
        aVal = showPercentFirst ? metricA.forecast : metricA.value;
        bVal = showPercentFirst ? metricB.forecast : metricB.value;
      } else {
        aVal = a[field as keyof RevenueSzRankingRow] as number;
        bVal = b[field as keyof RevenueSzRankingRow] as number;
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
      <RevenueSzRankingMobile
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
                field="revenueSz" 
                label="Выручка СЗ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px]"
              />
              <SortableHeader 
                field="ordersCount" 
                label="Заказов СЗ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="clientsCount" 
                label="Кол-во ФЛ" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[80px]"
              />
              <SortableHeader 
                field="avgCost" 
                label="Ср. стоимость" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px]"
              />
              <SortableHeader 
                field="conversion" 
                label="Конверсия" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[85px]"
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
                  <span className={`text-sm font-bold ${getPercentColor(row.planPercent)}`}>
                    {row.planPercent}%
                  </span>
                </td>
                
                {/* Revenue SZ */}
                <MetricCell metric={row.revenueSz} formatValue={formatNumber} showPercentFirst={showPercentFirst} />
                
                {/* Orders Count */}
                <MetricCell metric={row.ordersCount} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix=" шт" />
                
                {/* Clients */}
                <MetricCell metric={row.clientsCount} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} />
                
                {/* Avg Cost */}
                <MetricCell metric={row.avgCost} formatValue={formatNumber} showPercentFirst={showPercentFirst} />
                
                {/* Conversion */}
                <MetricCell metric={row.conversion} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix="%" />
                
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
