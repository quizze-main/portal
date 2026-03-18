import { useMemo, useState } from 'react';
import { Activity, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { managersData } from '@/data/mockData';
import { managersDataByPeriod } from '@/data/periodData';
import { FilterPeriod } from './FilterBar';
import { formatNumber } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { ManagerRankingMobile } from './ManagerRankingMobile';
import { ManagerRankingRow, DisplayMode } from './ManagerRankingCard';
import { getManagerAvatar, cn } from '@/lib/utils';

type SortField = 'name' | 'planPercent' | 'revenueSz' | 'revenueZz' | 'clientsCount' | 
                  'avgGlasses' | 'conversion' | 'csi' | 'margin' | 'lostRevenue';
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
  plan: number;
  forecast: number;
  label: ForecastLabel;
}

// Определяем какие метрики показывают прогноз, а какие отклонение
const metricLabels: Record<string, ForecastLabel> = {
  'revenue_sz': 'forecast',
  'revenue_zz': 'forecast',
  'clients_count': 'forecast',
  'avg_glasses': 'deviation',
  'conversion': 'deviation',
  'csi': 'deviation',
  'margin': 'deviation',
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

// Индикатор прогноза (для Выручки, Клиентов) — красный если < 100%, зелёный если >= 100%
const ForecastIndicator = ({ forecast }: { forecast: number }) => {
  const color = forecast >= 100 ? 'text-emerald-600' : 'text-red-500';
  
  return (
    <span className={`${color} flex items-center justify-center gap-0.5`}>
      <Activity className="w-3 h-3" />
      {forecast}%
    </span>
  );
};

// Индикатор отклонения (для Конверсии, CSI и т.д.) — с подсветкой
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

// Универсальный индикатор
const MetricForecastIndicator = ({ metric }: { metric: MetricIndicator }) => {
  if (metric.label === 'forecast') {
    return <ForecastIndicator forecast={metric.forecast} />;
  }
  return <DeviationIndicator value={metric.forecast} />;
};

// Универсальная ячейка метрики
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
      // Режим "Факт": факт vs процент
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
      // Режим "План": план vs факт (с цветовой индикацией)
      const diff = metric.value - metric.plan;
      const factColor = diff >= 0 ? 'text-emerald-600' : 'text-red-500';
      
      if (isInverted) {
        // Принудительная инверсия: факт сверху, план снизу
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
        // По умолчанию: план сверху, факт снизу
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

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

interface ManagerRankingTableProps {
  period?: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
}

export function ManagerRankingTable({ period = 'month', onManagerClick }: ManagerRankingTableProps) {
  const isMobile = useIsMobile();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fact');
  const [isInverted, setIsInverted] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'planPercent', direction: 'desc' });
  
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const rows: ManagerRankingRow[] = useMemo(() => {
    const dataSource = managersDataByPeriod[period] || managersData;
    const managers = Object.values(dataSource);
    
    const managerRows = managers.map(manager => {
      const metrics = manager.metricsLevel1;
      const avgForecast = metrics.reduce((sum, m) => sum + m.forecast, 0) / metrics.length;
      
      const getMetric = (id: string): MetricIndicator => {
        const m = metrics.find(metric => metric.id === id);
        return {
          value: m?.current || 0,
          plan: m?.plan || 0,
          forecast: m?.forecast || 0,
          label: metricLabels[id] || 'forecast',
        };
      };
      
      return {
        id: manager.id,
        rank: 0,
        name: manager.name,
        role: manager.role,
        avatar: manager.avatar,
        planPercent: Math.round(avgForecast),
        revenueSz: getMetric('revenue_sz'),
        revenueZz: getMetric('revenue_zz'),
        clientsCount: getMetric('clients_count'),
        avgGlasses: getMetric('avg_glasses'),
        conversion: getMetric('conversion'),
        csi: getMetric('csi'),
        margin: getMetric('margin'),
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
      
      // Для метрик с MetricIndicator — сортируем в зависимости от режима
      if (['revenueSz', 'revenueZz', 'clientsCount', 'avgGlasses', 'conversion', 'csi', 'margin'].includes(field)) {
        const metricA = a[field as keyof ManagerRankingRow] as MetricIndicator;
        const metricB = b[field as keyof ManagerRankingRow] as MetricIndicator;
        // Режим "план" — сортируем по plan, иначе по value
        if (displayMode === 'plan') {
          aVal = metricA.plan;
          bVal = metricB.plan;
        } else {
          aVal = metricA.value;
          bVal = metricB.value;
        }
      } else {
        aVal = a[field as keyof ManagerRankingRow] as number;
        bVal = b[field as keyof ManagerRankingRow] as number;
      }
      
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return managerRows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  }, [sortConfig, displayMode, period]);

  if (isMobile) {
    return (
      <ManagerRankingMobile
        rows={rows}
        displayMode={displayMode}
        isInverted={isInverted}
        onDisplayModeChange={setDisplayMode}
        onInvertedChange={setIsInverted}
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
        
        {/* New toggle: Прогноз | ⇅ | План */}
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
        <table className="w-full border-collapse text-sm min-w-[900px]">
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
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="revenueZz" 
                label="Выручка ЗЗ" 
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
                field="avgGlasses" 
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
                field="csi" 
                label="CSI" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[55px]"
              />
              <SortableHeader 
                field="margin" 
                label="Маржа" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[90px]"
              />
              <SortableHeader 
                field="lostRevenue" 
                label="Потери" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground whitespace-nowrap w-[110px]"
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
                <MetricCell metric={row.revenueSz} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Revenue ZZ */}
                <MetricCell metric={row.revenueZz} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Clients */}
                <MetricCell metric={row.clientsCount} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Avg glasses */}
                <MetricCell metric={row.avgGlasses} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Conversion */}
                <MetricCell metric={row.conversion} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} suffix="%" />
                
                {/* CSI */}
                <MetricCell metric={row.csi} formatValue={(v) => String(v)} displayMode={displayMode} isInverted={isInverted} suffix="%" />
                
                {/* Margin */}
                <MetricCell metric={row.margin} formatValue={formatNumber} displayMode={displayMode} isInverted={isInverted} />
                
                {/* Lost revenue / Reserve */}
                <td className={`px-3 py-2.5 text-center whitespace-nowrap ${
                  row.planPercent >= 100 
                    ? 'bg-emerald-50/80 dark:bg-emerald-900/20' 
                    : 'bg-amber-50/80 dark:bg-amber-900/20'
                }`}>
                  <span className={`text-sm font-medium ${
                    row.planPercent >= 100 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {row.planPercent >= 100 
                      ? `+${formatNumber(Math.abs(row.lostRevenue))} ₽`
                      : `−${formatNumber(Math.abs(row.lostRevenue))} ₽`
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
