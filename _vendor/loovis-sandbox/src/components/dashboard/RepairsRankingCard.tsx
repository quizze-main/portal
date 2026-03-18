import { cn, getManagerAvatar } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatNumber } from '@/lib/formatters';

export type RepairsSortField = 'name' | 'planPercent' | 'avgRepairPrice' | 'repairsCount' | 'lostRevenue';

interface MetricValue {
  value: number;
  forecast: number;
}

export interface RepairsManagerRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  avgRepairPrice: MetricValue;
  repairsCount: MetricValue;
  lostRevenue: number;
}

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

interface RepairsManagerCardProps {
  manager: RepairsManagerRow;
  showPercentFirst: boolean;
  highlightedField?: RepairsSortField;
  onClick?: () => void;
}

export const RepairsRankingCard = ({ manager, showPercentFirst, highlightedField, onClick }: RepairsManagerCardProps) => {
  const planProgress = Math.min(manager.planPercent, 100);
  
  return (
    <div 
      onClick={onClick}
      className="bg-card border rounded-xl p-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
    >
      {/* Header: Rank + Avatar + Name + Plan */}
      <div className="flex items-center gap-3 mb-3">
        {/* Rank */}
        <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0">
          {manager.rank}
        </span>
        
        {/* Avatar */}
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
          <AvatarFallback className="text-xs bg-orange-500/10 text-orange-600 font-semibold">
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
      <div className="grid grid-cols-2 gap-1 mb-2">
        <CompactMetric 
          label="Ср. ремонта" 
          value={manager.avgRepairPrice.value} 
          forecast={manager.avgRepairPrice.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'avgRepairPrice'}
        />
        <CompactMetric 
          label="Кол-во" 
          value={manager.repairsCount.value} 
          forecast={manager.repairsCount.forecast} 
          showPercentFirst={showPercentFirst}
          isHighlighted={highlightedField === 'repairsCount'}
          formatFn={(v) => String(v)}
        />
      </div>
      
      {/* Lost revenue / Reserve */}
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
