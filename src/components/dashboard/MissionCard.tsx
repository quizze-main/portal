import { Sparkles, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';
import { FullWidthKPIMetric } from './KPIFullWidthCard';

interface MissionCardProps {
  metric?: FullWidthKPIMetric;
  onClick?: () => void;
  missionText?: string;
  isEditMode?: boolean;
  editDraft?: string;
  onEditDraftChange?: (text: string) => void;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1).replace('.', ',') + ' млн';
    }
    if (value >= 1000) {
      return Math.round(value / 1000) + ' тыс';
    }
    return value.toLocaleString('ru-RU') + ' ₽';
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return value.toLocaleString('ru-RU');
};

const DEFAULT_MISSION = 'Каждое следующее поколение видит лучше предыдущего благодаря заботе о зрении с детства';

export function MissionCard({ metric, onClick, missionText, isEditMode, editDraft, onEditDraftChange }: MissionCardProps) {
  const percent = metric?.plan && metric.plan > 0 ? Math.round((metric.current / metric.plan) * 100) : 0;
  const displayText = missionText || DEFAULT_MISSION;

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl p-4 text-left transition-all duration-300",
        "bg-gradient-to-br from-yellow-200 via-amber-100 to-yellow-100",
        "dark:from-yellow-900/50 dark:via-amber-900/40 dark:to-yellow-800/50",
        "border-2 border-yellow-400/80 dark:border-yellow-600/60",
        "shadow-lg shadow-yellow-300/50 dark:shadow-yellow-900/30",
        !isEditMode && "hover:shadow-xl hover:shadow-yellow-400/60 dark:hover:shadow-yellow-800/40",
        !isEditMode && "hover:scale-[1.01] active:scale-[0.99]",
        isEditMode && "ring-2 ring-primary/50",
        "overflow-hidden group"
      )}
    >
      {/* Ambient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-amber-400/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Sparkle decorations */}
      <div className="absolute top-3 right-16 text-yellow-500/60 dark:text-yellow-500/40">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="absolute bottom-4 right-8 text-amber-400/40 dark:text-amber-500/30">
        <Sparkles className="w-3 h-3" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-xs font-bold tracking-wider",
              "text-yellow-700 dark:text-yellow-400"
            )}>
              Миссия
            </span>
            {isEditMode && (
              <Pencil className="w-3 h-3 text-yellow-600/60" />
            )}
          </div>
          {isEditMode ? (
            <textarea
              value={editDraft ?? displayText}
              onChange={(e) => onEditDraftChange?.(e.target.value)}
              maxLength={500}
              rows={2}
              className={cn(
                "w-full mt-1 text-xs italic resize-none rounded-lg px-2 py-1.5",
                "bg-white/60 dark:bg-black/20 backdrop-blur",
                "border border-yellow-400/50 dark:border-yellow-600/40",
                "text-amber-700 dark:text-amber-300",
                "placeholder:text-amber-400/60",
                "focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
              )}
              placeholder="Введите текст миссии..."
            />
          ) : (
            <p className="text-xs italic text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              {displayText}
            </p>
          )}
        </div>

        {/* Deviation badge */}
      </div>

      {/* Explicit open button (prevents accidental open while scrolling) */}
      {onClick && !isEditMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={cn(
            "absolute top-3 right-3 z-20",
            "h-8 w-8 rounded-full",
            "bg-white/60 dark:bg-black/20 backdrop-blur border border-yellow-400/40",
            "flex items-center justify-center",
            "text-yellow-800/80 dark:text-yellow-200/80 hover:text-yellow-900 dark:hover:text-yellow-100",
            "active:scale-95 transition"
          )}
          aria-label="Открыть"
          title="Открыть"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}

      {/* Main content */}
      {metric ? (
        <div className="flex items-center gap-4 relative z-10">
          {/* Donut chart */}
          <div className="flex-shrink-0">
            <KPIDonutChart
              value={metric.current}
              maxValue={metric.plan}
              forecast={percent}
              displayValue={`${percent}%`}
              color={metric.color}
              size={64}
            />
          </div>

          {/* Values */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="text-base font-semibold text-foreground">
                {metric.name}
              </span>
              <span className="text-2xl font-bold text-foreground">
                {formatValue(metric.current, metric.unit)}
              </span>
              <span className="text-muted-foreground">
                из {formatValue(metric.plan, metric.unit)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 w-full rounded-full bg-yellow-200/50 dark:bg-yellow-900/40 overflow-hidden">
              <div
                className={cn(
                  "absolute h-full rounded-full transition-all duration-700",
                  "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500",
                  "shadow-sm"
                )}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 text-sm text-amber-700/80 dark:text-amber-300/80">
          {/* Без KPI — пока нет отдельного API для "миссии" */}
        </div>
      )}
    </div>
  );
}
