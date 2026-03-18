import { cn } from '@/lib/utils';
import { formatWithUnit } from '@/lib/formatters';

export type ClubStatus = 'good' | 'warning' | 'critical';

interface ClubSummaryCardProps {
  current: number;
  plan: number;
  reserve?: number;
  forecast?: number;
  unit: '₽' | '%' | 'шт' | 'count';
  status: ClubStatus;
}

const getStatusColor = (status: ClubStatus) => {
  switch (status) {
    case 'good':
      return 'bg-emerald-500';
    case 'warning':
      return 'bg-amber-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
};

const getStatusTextColor = (status: ClubStatus) => {
  switch (status) {
    case 'good':
      return 'text-emerald-600';
    case 'warning':
      return 'text-amber-600';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
};

export function ClubSummaryCard({
  current,
  plan,
  reserve,
  forecast,
  unit,
  status
}: ClubSummaryCardProps) {
  const percentage = Math.min(Math.round((current / plan) * 100), 100);

  return (
    <div className="bg-card rounded-xl p-3 shadow-sm space-y-3">
      {/* Header: Факт и План */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Факт</span>
          <p className={cn("text-xl font-bold", getStatusTextColor(status))}>
            {formatWithUnit(current, unit)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">План</span>
          <p className="text-base font-medium text-foreground">
            {formatWithUnit(plan, unit)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full", getStatusColor(status))}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={cn("text-xs font-medium tabular-nums", getStatusTextColor(status))}>
          {percentage}%
        </span>
      </div>

      {/* Bottom Stats: Запас и Прогноз — inline */}
      {(reserve !== undefined || forecast !== undefined) && (
        <div className="flex items-center gap-4 text-xs">
          {reserve !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Запас:</span>
              <span className={cn("font-medium", reserve >= 0 ? "text-emerald-600" : "text-red-600")}>
                {reserve >= 0 ? '+' : ''}{formatWithUnit(reserve, unit)}
              </span>
            </div>
          )}
          {forecast !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Прогноз:</span>
              <span className="font-medium text-foreground">
                {formatWithUnit(forecast, unit)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
