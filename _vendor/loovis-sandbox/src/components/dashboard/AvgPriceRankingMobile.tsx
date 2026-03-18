import { ArrowUpDown, ChevronDown, Activity } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatNumber } from '@/lib/formatters';

export type AvgPriceSortField = 'name' | 'planPercent' | 'glassesComplete' | 'frame' | 
                                 'lens' | 'designShare' | 'designLens' | 'lostRevenue';

interface MetricValue {
  value: number;
  forecast: number;
}

export interface AvgPriceManagerRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  glassesComplete: MetricValue;
  frame: MetricValue;
  manufacturing: MetricValue;
  lens: MetricValue;
  designShare: MetricValue;
  designLens: MetricValue;
  lostRevenue: number;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: AvgPriceSortField;
  direction: SortDirection;
}

interface AvgPriceRankingMobileProps {
  rows: AvgPriceManagerRow[];
  showPercentFirst: boolean;
  onToggleView: () => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: AvgPriceSortField) => void;
}

const sortOptions: { field: AvgPriceSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'name', label: 'Имя' },
  { field: 'glassesComplete', label: 'Ср. очков' },
  { field: 'frame', label: 'Ср. оправы' },
  { field: 'lens', label: 'Ср. линзы' },
  { field: 'designShare', label: 'Доля с дизайном' },
  { field: 'designLens', label: 'Ср. линз с дизайном' },
  { field: 'lostRevenue', label: 'Потери' },
];

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressColor = (percent: number): string => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

interface CompactMetricProps {
  label: string;
  value: number;
  forecast: number;
  showPercentFirst: boolean;
  isHighlighted?: boolean;
  suffix?: string;
  formatFn?: (v: number) => string;
}

const CompactMetric = ({ 
  label, 
  value, 
  forecast, 
  showPercentFirst, 
  isHighlighted = false,
  suffix = '',
  formatFn = formatNumber
}: CompactMetricProps) => {
  const forecastColor = forecast >= 100 ? 'text-emerald-600' : forecast >= 80 ? 'text-amber-500' : 'text-red-500';
  
  return (
    <div className={`text-center p-1.5 rounded ${isHighlighted ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}>
      <p className="text-[10px] text-muted-foreground mb-0.5 truncate">{label}</p>
      {showPercentFirst ? (
        <>
          <p className={`text-xs font-bold ${forecastColor} flex items-center justify-center gap-0.5`}>
            <Activity className="w-2.5 h-2.5" />
            {forecast}%
          </p>
          <p className="text-[10px] text-muted-foreground">{formatFn(value)}{suffix}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-foreground">{formatFn(value)}{suffix}</p>
          <p className={`text-[10px] ${forecastColor} flex items-center justify-center gap-0.5`}>
            <Activity className="w-2.5 h-2.5" />
            {forecast}%
          </p>
        </>
      )}
    </div>
  );
};

interface AvgPriceManagerCardProps {
  manager: AvgPriceManagerRow;
  showPercentFirst: boolean;
  highlightedField?: AvgPriceSortField;
  onClick?: () => void;
}

const AvgPriceManagerCard = ({ manager, showPercentFirst, highlightedField, onClick }: AvgPriceManagerCardProps) => {
  const planProgress = Math.min(manager.planPercent, 100);
  
  return (
    <div 
      onClick={onClick}
      className="bg-card border rounded-xl p-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
    >
      {/* Header: Rank + Avatar + Name + Plan */}
      <div className="flex items-center gap-3 mb-3">
        {/* Rank - separate element */}
        <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0">
          {manager.rank}
        </span>
        
        {/* Avatar */}
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {getInitials(manager.name)}
          </AvatarFallback>
        </Avatar>
        
        {/* Name/Role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{manager.name}</p>
          <p className="text-xs text-muted-foreground truncate">{manager.role}</p>
        </div>
        
        {/* Plan percent */}
        <div className="text-right flex-shrink-0 pl-2">
          <p className={`text-base font-bold ${getPercentColor(manager.planPercent)}`}>
            {manager.planPercent}%
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full ${getProgressColor(manager.planPercent)} transition-all duration-500 rounded-full`}
          style={{ width: `${planProgress}%` }}
        />
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <CompactMetric 
          label="Ср. очков" 
          value={manager.glassesComplete.value} 
          forecast={manager.glassesComplete.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'glassesComplete'}
        />
        <CompactMetric 
          label="Ср. оправы" 
          value={manager.frame.value} 
          forecast={manager.frame.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'frame'}
        />
        <CompactMetric 
          label="Ср. линзы" 
          value={manager.lens.value} 
          forecast={manager.lens.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'lens'}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-1 mb-2">
        <CompactMetric 
          label="Доля дизайн" 
          value={manager.designShare.value} 
          forecast={manager.designShare.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'designShare'}
          suffix="%"
          formatFn={(v) => String(v)}
        />
        <CompactMetric 
          label="Ср. дизайн" 
          value={manager.designLens.value} 
          forecast={manager.designLens.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'designLens'}
        />
      </div>
      
      {/* Lost revenue / Over-achievement */}
      <div className={cn(
        "text-center rounded-lg py-1.5",
        manager.lostRevenue >= 0 
          ? "bg-amber-50 dark:bg-amber-900/30" 
          : "bg-emerald-50 dark:bg-emerald-900/30",
        highlightedField === 'lostRevenue' && (manager.lostRevenue >= 0 ? 'ring-2 ring-amber-400' : 'ring-2 ring-emerald-400')
      )}>
        <p className={cn(
          "text-[10px] mb-0.5",
          manager.lostRevenue >= 0 
            ? "text-amber-600 dark:text-amber-400" 
            : "text-emerald-600 dark:text-emerald-400"
        )}>
          {manager.lostRevenue >= 0 ? 'Потери' : 'Запас'}
        </p>
        <p className={cn(
          "text-sm font-bold",
          manager.lostRevenue >= 0 
            ? "text-amber-700 dark:text-amber-300" 
            : "text-emerald-700 dark:text-emerald-300"
        )}>
          {manager.lostRevenue >= 0 
            ? `−${formatNumber(manager.lostRevenue)} ₽`
            : `+${formatNumber(Math.abs(manager.lostRevenue))} ₽`
          }
        </p>
      </div>
    </div>
  );
};

export function AvgPriceRankingMobile({
  rows,
  showPercentFirst,
  onToggleView,
  onManagerClick,
  sortConfig,
  onSort,
}: AvgPriceRankingMobileProps) {
  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || 'Сортировка';
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/60">
        <h3 className="font-semibold text-foreground mb-2">По менеджерам — Ср. стоимость</h3>
        
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs gap-1.5 flex-1 justify-between bg-background"
              >
                <span className="truncate">{currentSortLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
              {sortOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.field}
                  onClick={() => onSort(option.field)}
                  className={sortConfig.field === option.field ? 'bg-muted' : ''}
                >
                  {option.label}
                  {sortConfig.field === option.field && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Toggle view */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleView}
            className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {showPercentFirst ? '%' : '₽'}
          </Button>
        </div>
      </div>
      
      {/* Cards List */}
      <div className="p-3 space-y-3">
        {rows.map((row) => (
          <AvgPriceManagerCard
            key={row.id}
            manager={row}
            showPercentFirst={showPercentFirst}
            highlightedField={sortConfig.field}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
