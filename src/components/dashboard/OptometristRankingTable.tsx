import { useMemo, useState } from 'react';
import { Activity, ArrowUpDown, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { optometristsData } from '@/data/mockData';
import { optometristsDataByPeriod } from '@/data/periodData';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { OptometristRankingMobile } from './OptometristRankingMobile';
import { OptometristRankingRow } from './OptometristRankingCard';

type SortField = 'name' | 'planPercent' | 'lensRevenue' | 'avgLensCheck' | 'designShare' | 
                  'diagToSale' | 'repairToDiag' | 'lostRevenue';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: SortField) => void;
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

// OptometristRankingRow imported from OptometristRankingCard

const metricLabels: Record<string, ForecastLabel> = {
  'lens_revenue': 'forecast',
  'avg_lens_check': 'deviation',
  'design_lens_share': 'deviation',
  'diag_to_sale': 'deviation',
  'repair_to_diag': 'deviation',
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

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

const MetricForecastIndicator = ({ metric, large = false }: { metric: MetricIndicator; large?: boolean }) => {
  if (metric.label === 'forecast') {
    return <ForecastIndicator forecast={metric.forecast} large={large} />;
  }
  return <DeviationIndicator value={metric.forecast} large={large} />;
};

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

interface OptometristRankingTableProps {
  period?: FilterPeriod;
  onOptometristClick?: (optometristId: string) => void;
}

export function OptometristRankingTable({ period = 'month', onOptometristClick }: OptometristRankingTableProps) {
  const isMobile = useIsMobile();
  const [showPercentFirst, setShowPercentFirst] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: OptometristRankingRow[] = useMemo(() => {
    const dataSource = optometristsDataByPeriod[period] || optometristsData;
    const optometrists = Object.values(dataSource);
    
    const optometristRows = optometrists.map(optometrist => {
      const metrics = optometrist.metricsLevel1;
      const avgForecast = metrics.reduce((sum, m) => sum + m.forecast, 0) / metrics.length;
      
      const getMetric = (id: string): MetricIndicator => {
        const m = metrics.find(metric => metric.id === id);
        return {
          value: m?.current || 0,
          forecast: m?.forecast || 0,
          label: metricLabels[id] || 'forecast',
        };
      };
      
      return {
        id: optometrist.id,
        rank: 0,
        name: optometrist.name,
        role: optometrist.role,
        avatar: optometrist.avatar,
        planPercent: Math.round(avgForecast),
        lensRevenue: getMetric('lens_revenue'),
        avgLensCheck: getMetric('avg_lens_check'),
        designShare: getMetric('design_lens_share'),
        diagToSale: getMetric('diag_to_sale'),
        repairToDiag: getMetric('repair_to_diag'),
        lostRevenue: optometrist.lostRevenue,
      };
    });
    
    optometristRows.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal: number, bVal: number;
      
      if (field === 'name') {
        const result = a.name.localeCompare(b.name, 'ru');
        return direction === 'desc' ? -result : result;
      }
      
      if (['lensRevenue', 'avgLensCheck', 'designShare', 'diagToSale', 'repairToDiag'].includes(field)) {
        const metricA = a[field as keyof OptometristRankingRow] as MetricIndicator;
        const metricB = b[field as keyof OptometristRankingRow] as MetricIndicator;
        aVal = showPercentFirst ? metricA.forecast : metricA.value;
        bVal = showPercentFirst ? metricB.forecast : metricB.value;
      } else {
        aVal = a[field as keyof OptometristRankingRow] as number;
        bVal = b[field as keyof OptometristRankingRow] as number;
      }
      
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return optometristRows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  }, [sortConfig, showPercentFirst, period]);

  if (isMobile) {
    return (
      <OptometristRankingMobile
        rows={rows}
        showPercentFirst={showPercentFirst}
        onToggleView={() => setShowPercentFirst(!showPercentFirst)}
        onOptometristClick={onOptometristClick}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden relative isolate">
      <div className="px-4 py-3 border-b bg-muted/60 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Рейтинг оптометристов</h3>
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
        <table className="w-full border-collapse text-sm min-w-[850px]">
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
                field="lensRevenue" 
                label="Выручка линзы" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px]"
              />
              <SortableHeader 
                field="avgLensCheck" 
                label="Ср.чек линзы" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[95px]"
              />
              <SortableHeader 
                field="designShare" 
                label="Доля с дизайном" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[110px]"
              />
              <SortableHeader 
                field="diagToSale" 
                label="Диагн.→Продажа" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[110px]"
              />
              <SortableHeader 
                field="repairToDiag" 
                label="Ремонт→Диагн." 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[105px]"
              />
              <SortableHeader 
                field="lostRevenue" 
                label="Потери/Запас" 
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
                className={`border-b last:border-b-0 hover:bg-primary/5 transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/40'
                }`}
              >
                <td className={`sticky left-0 z-[5] px-2 py-2 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-5 text-center flex-shrink-0">{row.rank}</span>
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={row.avatar} alt={row.name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.role}</p>
                    </div>
                    {onOptometristClick && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOptometristClick(row.id);
                        }}
                        className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background active:scale-95 transition flex-shrink-0"
                        aria-label="Открыть"
                        title="Открыть"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
                
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-sm font-bold ${getPercentColor(row.planPercent)}`}>
                    {row.planPercent}%
                  </span>
                </td>
                
                <MetricCell metric={row.lensRevenue} formatValue={formatNumber} showPercentFirst={showPercentFirst} />
                <MetricCell metric={row.avgLensCheck} formatValue={formatNumber} showPercentFirst={showPercentFirst} />
                <MetricCell metric={row.designShare} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix="%" />
                <MetricCell metric={row.diagToSale} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix="%" />
                <MetricCell metric={row.repairToDiag} formatValue={(v) => String(v)} showPercentFirst={showPercentFirst} suffix="%" />
                
                <td className={`px-3 py-2.5 text-center whitespace-nowrap ${
                  row.lostRevenue > 0 
                    ? 'bg-amber-50/80 dark:bg-amber-900/20' 
                    : 'bg-emerald-50/80 dark:bg-emerald-900/20'
                }`}>
                  <span className={`text-sm font-medium ${
                    row.lostRevenue > 0 
                      ? 'text-amber-700 dark:text-amber-400' 
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {row.lostRevenue <= 0 ? '+' : ''}{formatNumber(Math.abs(row.lostRevenue))}
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
