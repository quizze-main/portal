import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getManagerAvatar } from '@/lib/utils';

type ForecastLabel = 'forecast' | 'deviation';

export type DisplayMode = 'fact' | 'plan';

interface MetricIndicator {
  value: number;
  plan: number;
  forecast: number;
  label: ForecastLabel;
}

export interface ManagerRankingRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  revenueSz: MetricIndicator;
  revenueZz: MetricIndicator;
  clientsCount: MetricIndicator;
  avgGlasses: MetricIndicator;
  conversion: MetricIndicator;
  csi: MetricIndicator;
  margin: MetricIndicator;
  lostRevenue: number;
}

export type ManagerSortField = 'name' | 'planPercent' | 'revenueSz' | 'revenueZz' | 'clientsCount' | 
                  'avgGlasses' | 'conversion' | 'csi' | 'margin' | 'lostRevenue';

interface ManagerRankingCardProps {
  manager: ManagerRankingRow;
  displayMode: DisplayMode;
  isInverted: boolean;
  highlightedField?: ManagerSortField;
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

const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
};

interface CompactMetricProps {
  label: string;
  metric: MetricIndicator;
  formatValue: (value: number) => string;
  suffix?: string;
  displayMode: DisplayMode;
  isInverted: boolean;
  isHighlighted?: boolean;
}

const CompactMetric = ({ label, metric, formatValue, suffix = '', displayMode, isInverted, isHighlighted }: CompactMetricProps) => {
  const getValues = () => {
    if (displayMode === 'fact') {
      // Режим "Факт": факт vs процент
      const factValue = (
        <span className="font-semibold text-foreground tabular-nums">{formatValue(metric.value)}{suffix}</span>
      );
      const percentValue = (
        <span className={`tabular-nums ${getIndicatorColor(metric.forecast, metric.label)}`}>
          {formatIndicator(metric.forecast, metric.label)}
        </span>
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
          primary: <span className={`font-semibold tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</span>,
          secondary: <span className="text-muted-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</span>,
        };
      } else {
        // По умолчанию: план сверху, факт снизу
        return {
          primary: <span className="font-semibold text-foreground tabular-nums">{formatValue(metric.plan)}{suffix}</span>,
          secondary: <span className={`tabular-nums ${factColor}`}>{formatValue(metric.value)}{suffix}</span>
        };
      }
    }
  };

  const { primary, secondary } = getValues();

  return (
    <div className={`text-center p-1.5 rounded-md min-h-[60px] min-w-0 flex flex-col justify-center transition-all ${
      isHighlighted 
        ? 'bg-primary/10 ring-1 ring-primary/40' 
        : 'bg-muted/30'
    }`}>
      <div className="text-[9px] text-muted-foreground mb-0.5 leading-tight break-words">{label}</div>
      <div className="text-xs font-medium leading-tight">
        {primary}
      </div>
      <div className="text-[9px] leading-tight">
        {secondary}
      </div>
    </div>
  );
};

// Mapping from sort field to metric label
const fieldToLabel: Record<ManagerSortField, string> = {
  name: '',
  planPercent: '',
  revenueSz: 'Выручка СЗ',
  revenueZz: 'Выручка ЗЗ',
  clientsCount: 'Кол-во ФЛ',
  avgGlasses: 'Ср. стоимость',
  conversion: 'Конверсия',
  csi: 'CSI',
  margin: 'Маржа',
  lostRevenue: 'Потери',
};

export function ManagerRankingCard({ manager, displayMode, isInverted, highlightedField, onClick }: ManagerRankingCardProps) {
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
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
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
      
      {/* Metrics Grid - 4 columns, 2 rows */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1.35fr] gap-1.5">
        <CompactMetric 
          label="Выручка СЗ" 
          metric={manager.revenueSz} 
          formatValue={formatNumber} 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('Выручка СЗ')}
        />
        <CompactMetric 
          label="Выручка ЗЗ" 
          metric={manager.revenueZz} 
          formatValue={formatNumber} 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('Выручка ЗЗ')}
        />
        <CompactMetric 
          label="Кол-во ФЛ" 
          metric={manager.clientsCount} 
          formatValue={(v) => String(v)} 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('Кол-во ФЛ')}
        />
        <CompactMetric 
          label="Ср. стоимость" 
          metric={manager.avgGlasses} 
          formatValue={formatNumber} 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('Ср. стоимость')}
        />
        <CompactMetric 
          label="Конверсия" 
          metric={manager.conversion} 
          formatValue={(v) => String(v)} 
          suffix="%" 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('Конверсия')}
        />
        <CompactMetric 
          label="CSI" 
          metric={manager.csi} 
          formatValue={(v) => String(v)} 
          suffix="%" 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('CSI')}
        />
        <CompactMetric 
          label="Маржа" 
          metric={manager.margin} 
          formatValue={formatNumber} 
          displayMode={displayMode}
          isInverted={isInverted}
          isHighlighted={isHighlighted('Маржа')}
        />
        
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
            <div className={`p-1.5 rounded text-center min-w-0 transition-all ${
              highlightedField === 'lostRevenue'
                ? 'bg-primary/10 ring-1 ring-primary/40'
                : bgColor
            }`}>
              <span className="text-[9px] text-muted-foreground block leading-tight">{label}</span>
              <span className={`text-[11px] font-medium ${textColor} leading-tight`}>
                {isOverPlan ? '+' : '−'}{formatNumber(Math.abs(manager.lostRevenue))}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
