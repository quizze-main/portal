import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type ForecastLabel = 'forecast' | 'deviation';

interface MetricIndicator {
  value: number;
  forecast: number;
  label: ForecastLabel;
}

export interface OptometristRankingRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  lensRevenue: MetricIndicator;
  avgLensCheck: MetricIndicator;
  designShare: MetricIndicator;
  diagToSale: MetricIndicator;
  repairToDiag: MetricIndicator;
  lostRevenue: number;
}

export type OptometristSortField = 'name' | 'planPercent' | 'lensRevenue' | 'avgLensCheck' | 'designShare' | 
                  'diagToSale' | 'repairToDiag' | 'lostRevenue';

interface OptometristRankingCardProps {
  optometrist: OptometristRankingRow;
  showPercentFirst: boolean;
  highlightedField?: OptometristSortField;
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
const fieldToLabel: Record<OptometristSortField, string> = {
  name: '',
  planPercent: '',
  lensRevenue: 'Выручка линзы',
  avgLensCheck: 'Ср. чек линзы',
  designShare: 'Доля с дизайном',
  diagToSale: 'Диагн.→Продажа',
  repairToDiag: 'Ремонт→Диагн.',
  lostRevenue: 'Потери',
};

export function OptometristRankingCard({ optometrist, showPercentFirst, highlightedField, onClick }: OptometristRankingCardProps) {
  const isOverPlan = optometrist.planPercent >= 100;
  const isHighlighted = (label: string) => highlightedField && fieldToLabel[highlightedField] === label;
  
  return (
    <div 
      onClick={onClick}
      className="bg-card rounded-xl border border-border/80 shadow-md p-2 cursor-pointer hover:bg-primary/5 transition-colors active:scale-[0.99]"
    >
      {/* Header: Rank + Avatar + Name + Progress */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-base font-bold w-5 text-center ${getPercentColor(optometrist.planPercent)}`}>
          {optometrist.rank}
        </span>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={optometrist.avatar} alt={optometrist.name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(optometrist.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{optometrist.name}</p>
        </div>
        <div className="flex items-center gap-2 min-w-[70px]">
          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getProgressColor(optometrist.planPercent)}`}
              style={{ width: `${Math.min(optometrist.planPercent, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${getPercentColor(optometrist.planPercent)}`}>
            {optometrist.planPercent}%
          </span>
        </div>
      </div>
      
      {/* Metrics Grid - 3 columns, 2 rows */}
      <div className="grid grid-cols-3 gap-1">
        <CompactMetric 
          label="Выручка линзы" 
          metric={optometrist.lensRevenue} 
          formatValue={formatNumber} 
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Выручка линзы')}
        />
        <CompactMetric 
          label="Ср. чек линзы" 
          metric={optometrist.avgLensCheck} 
          formatValue={formatNumber} 
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Ср. чек линзы')}
        />
        <CompactMetric 
          label="Доля с дизайном" 
          metric={optometrist.designShare} 
          formatValue={(v) => String(v)} 
          suffix="%" 
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Доля с дизайном')}
        />
        <CompactMetric 
          label="Диагн.→Продажа" 
          metric={optometrist.diagToSale} 
          formatValue={(v) => String(v)} 
          suffix="%" 
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Диагн.→Продажа')}
        />
        <CompactMetric 
          label="Ремонт→Диагн." 
          metric={optometrist.repairToDiag} 
          formatValue={(v) => String(v)} 
          suffix="%" 
          showPercentFirst={showPercentFirst}
          isHighlighted={isHighlighted('Ремонт→Диагн.')}
        />
        
        {/* Lost Revenue / Reserve - dynamic styling based on plan */}
        <div className={`p-1.5 rounded transition-all ${
          highlightedField === 'lostRevenue'
            ? 'bg-primary/10 ring-1 ring-primary/40'
            : isOverPlan 
              ? 'bg-emerald-50/80 dark:bg-emerald-900/20' 
              : 'bg-red-50/80 dark:bg-red-900/20'
        }`}>
          <span className="text-[9px] text-muted-foreground block truncate leading-tight">
            {isOverPlan ? 'Запас' : 'Потери'}
          </span>
          <span className={`text-[11px] font-medium leading-tight ${
            isOverPlan 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatNumber(optometrist.lostRevenue)}
          </span>
        </div>
      </div>
    </div>
  );
}
