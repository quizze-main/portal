import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getManagerAvatar } from '@/lib/utils';

type ForecastLabel = 'forecast' | 'deviation';

interface MetricIndicator {
  value: number;
  forecast: number;
  label: ForecastLabel;
}

export interface RevenueZzRankingRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  revenueZz: MetricIndicator;
  closingsCount: MetricIndicator;
  avgClosingDays: MetricIndicator;
  onTimePercent: MetricIndicator;
  lostRevenue: number;
}

export type RevenueZzSortField = 'name' | 'planPercent' | 'revenueZz' | 'closingsCount' | 
                  'avgClosingDays' | 'onTimePercent' | 'lostRevenue';

interface RevenueZzRankingCardProps {
  manager: RevenueZzRankingRow;
  showPercentFirst: boolean;
  highlightedField?: RevenueZzSortField;
  onClick?: () => void;
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

const getIndicatorColor = (forecast: number, label: ForecastLabel): string => {
  if (label === 'forecast') {
    return forecast >= 100 ? 'text-emerald-600' : 'text-red-500';
  }
  const deviation = forecast - 100;
  if (deviation >= 5) return 'text-emerald-600';
  if (deviation <= -5) return 'text-red-500';
  return 'text-muted-foreground';
};

const formatIndicator = (forecast: number, label: ForecastLabel): string => {
  if (label === 'forecast') return `${forecast}%`;
  const deviation = forecast - 100;
  return `${deviation >= 0 ? '+' : ''}${deviation}%`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

interface CompactMetricProps {
  label: string;
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  suffix?: string;
  showPercentFirst: boolean;
  isHighlighted?: boolean;
}

const CompactMetric = ({ label, metric, formatValue, suffix = '', showPercentFirst, isHighlighted }: CompactMetricProps) => (
  <div className={`p-1.5 rounded transition-all ${
    isHighlighted 
      ? 'bg-primary/10 ring-1 ring-primary/40' 
      : 'bg-muted/30'
  }`}>
    <span className="text-[9px] text-muted-foreground block truncate leading-tight">{label}</span>
    <div className="flex items-center gap-1 text-[11px] leading-tight">
      {showPercentFirst ? (
        <>
          <span className={`font-medium ${getIndicatorColor(metric.forecast, metric.label)}`}>
            {formatIndicator(metric.forecast, metric.label)}
          </span>
          <span className="text-muted-foreground">{formatValue(metric.value)}{suffix}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-foreground">{formatValue(metric.value)}{suffix}</span>
          <span className={getIndicatorColor(metric.forecast, metric.label)}>
            {formatIndicator(metric.forecast, metric.label)}
          </span>
        </>
      )}
    </div>
  </div>
);

// Mapping from sort field to metric label
const fieldToLabel: Record<RevenueZzSortField, string> = {
  name: '',
  planPercent: '',
  revenueZz: 'Выручка ЗЗ',
  closingsCount: 'Закрытий',
  avgClosingDays: 'Ср. время',
  onTimePercent: '% в срок',
  lostRevenue: 'Потери',
};

export function RevenueZzRankingCard({ manager, showPercentFirst, highlightedField, onClick }: RevenueZzRankingCardProps) {
  const isHighlighted = (label: string) => highlightedField && fieldToLabel[highlightedField] === label;
  
  return (
    <div 
      onClick={onClick}
      className="bg-card rounded-xl border border-border/80 shadow-md p-2 cursor-pointer hover:bg-primary/5 transition-colors active:scale-[0.99]"
    >
      {/* Header: Rank + Avatar + Name + Progress */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-base font-bold w-5 text-center ${getPercentColor(manager.planPercent)}`}>
          {manager.rank}
        </span>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
          <AvatarFallback className="text-xs bg-cyan-500/10 text-cyan-600">
            {getInitials(manager.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{manager.name}</p>
        </div>
        <div className="flex items-center gap-2 min-w-[70px]">
          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getProgressColor(manager.planPercent)}`}
              style={{ width: `${Math.min(manager.planPercent, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${getPercentColor(manager.planPercent)}`}>
            {manager.planPercent}%
          </span>
        </div>
      </div>
      
      {/* Metrics Grid - 3 columns, 2 rows */}
      <div className="grid grid-cols-3 gap-1">
        <CompactMetric 
          label="Выручка ЗЗ" 
          metric={manager.revenueZz} 
          formatValue={formatNumber} 
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Выручка ЗЗ')}
        />
        <CompactMetric 
          label="Закрытий" 
          metric={manager.closingsCount} 
          formatValue={(v) => String(v)} 
          suffix=" шт"
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Закрытий')}
        />
        <CompactMetric 
          label="Ср. время" 
          metric={manager.avgClosingDays} 
          formatValue={(v) => String(v)} 
          suffix=" дн"
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Ср. время')}
        />
        <CompactMetric 
          label="% в срок" 
          metric={manager.onTimePercent} 
          formatValue={(v) => String(v)} 
          suffix="%"
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('% в срок')}
        />
        
        {/* Empty cell for alignment */}
        <div />
        
        {/* Lost Revenue / Reserve - dynamic styling based on plan */}
        {(() => {
          const isOverPlan = manager.planPercent >= 100;
          const label = isOverPlan ? 'Запас' : 'Потери';
          const bgColor = isOverPlan 
            ? 'bg-emerald-50/80 dark:bg-emerald-900/20' 
            : 'bg-red-50/80 dark:bg-red-900/20';
          const textColor = isOverPlan 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-red-600 dark:text-red-400';
          
          return (
            <div className={`p-1.5 rounded transition-all ${
              highlightedField === 'lostRevenue'
                ? 'bg-primary/10 ring-1 ring-primary/40'
                : bgColor
            }`}>
              <span className="text-[9px] text-muted-foreground block truncate leading-tight">{label}</span>
              <span className={`text-[11px] font-medium ${textColor} leading-tight`}>
                {isOverPlan ? '+' : '−'}{formatNumber(manager.lostRevenue)}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
