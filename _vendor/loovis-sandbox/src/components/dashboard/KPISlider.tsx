import { cn } from "@/lib/utils";

export type KPIStatus = 'good' | 'warning' | 'critical';

interface KPISliderProps {
  current: number;
  plan: number;
  reserve?: number;
  forecast: number;
  status: KPIStatus;
  unit: '₽' | '%' | 'шт';
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return value.toLocaleString('ru-RU');
};

const getProgressColor = (status: KPIStatus): string => {
  switch (status) {
    case 'good':
      return 'bg-success';
    case 'warning':
      return 'bg-primary/60';
    case 'critical':
      return 'bg-destructive';
  }
};

export function KPISlider({
  current,
  plan,
  reserve,
  forecast,
  status,
  unit,
  showLabels = true,
  compact = false,
  className,
}: KPISliderProps) {
  // Calculate positions as percentages
  const currentPercent = Math.min((current / plan) * 100, 100);
  const reservePercent = reserve ? Math.min(((current + reserve) / plan) * 100, 100) : currentPercent;
  const isCritical = status === 'critical';
  
  return (
    <div className={cn("w-full", className)}>
      {/* Values row */}
      <div className={cn(
        "flex items-center justify-between mb-2",
        compact ? "text-xs" : "text-sm"
      )}>
        <span className={cn(
          "font-bold text-base",
          isCritical ? "text-destructive" : "text-foreground"
        )}>
          {formatValue(current, unit)}
        </span>
        {reserve && reserve > 0 && (
          <span className="text-kpi-reserve font-medium">
            +{formatValue(reserve, unit)}
          </span>
        )}
        <span className={cn(
          "font-semibold",
          isCritical ? "text-destructive" : "text-muted-foreground"
        )}>
          {forecast}%
        </span>
        <span className="text-muted-foreground font-medium">
          {formatValue(plan, unit)}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
        {/* Reserve bar (lighter) */}
        {reserve && reserve > 0 && (
          <div
            className="absolute h-full bg-kpi-reserve/40 rounded-full transition-all duration-500"
            style={{ width: `${reservePercent}%` }}
          />
        )}
        
        {/* Current progress bar */}
        <div
          className={cn(
            "absolute h-full rounded-full transition-all duration-500",
            getProgressColor(status)
          )}
          style={{ width: `${currentPercent}%` }}
        />
      </div>

      {/* Labels row */}
      {showLabels && !compact && (
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground font-medium">
          <span>Факт</span>
          {reserve && reserve > 0 && <span className="text-kpi-reserve">Запас</span>}
          <span>Прогноз</span>
          <span>План</span>
        </div>
      )}
    </div>
  );
}
