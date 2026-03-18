import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTodayFactStatus } from '@/hooks/useTodayFactStatus';
import type { DashboardMetricConfig } from '@/lib/internalApiClient';
import { cn } from '@/lib/utils';

interface FactStatusCardProps {
  storeId: string;
  metrics: DashboardMetricConfig[];
  onOpen: () => void;
}

/** Format "2026-03-13" → "13 мар" */
function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const month = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
  return `${day} ${month}`;
}

export function FactStatusCard({ storeId, metrics, onOpen }: FactStatusCardProps) {
  const manualMetrics = useMemo(
    () => (metrics || []).filter(m => m.source === 'manual' && m.enabled !== false),
    [metrics],
  );

  const manualMetricIds = useMemo(
    () => manualMetrics.map(m => m.id),
    [manualMetrics],
  );

  const { filledCount, totalCount, isFilled, hasMissedDays, missedDates, isLoading } =
    useTodayFactStatus(storeId, manualMetricIds);

  // All hooks must be above early returns (React rules of hooks)
  const missedLabel = useMemo(() => {
    if (!hasMissedDays) return '';
    const maxShow = 3;
    const shown = missedDates.slice(0, maxShow).map(shortDate).join(', ');
    const rest = missedDates.length - maxShow;
    return rest > 0 ? `${shown} +${rest}` : shown;
  }, [missedDates, hasMissedDays]);

  if (totalCount === 0 && !isLoading) return null;

  if (isLoading) {
    return <div className="rounded-xl bg-muted/50 animate-pulse h-[36px]" />;
  }

  // Priority: red (missed days) > amber (today unfilled) > emerald (all good)
  const state: 'red' | 'amber' | 'emerald' =
    hasMissedDays ? 'red' : !isFilled ? 'amber' : 'emerald';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full rounded-xl px-3 py-2 text-left transition-all duration-200',
        'border cursor-pointer group',
        'hover:shadow-sm active:scale-[0.99]',
        state === 'emerald' && 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60',
        state === 'amber' && 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60',
        state === 'red' && 'bg-red-50/80 border-red-300 dark:bg-red-950/30 dark:border-red-800/60',
      )}
    >
      <div className="flex items-center gap-2">
        {/* Icon — only for red and emerald */}
        {state === 'red' && (
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
        )}
        {state === 'emerald' && (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
        )}

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-semibold truncate',
              state === 'emerald' && 'text-emerald-700 dark:text-emerald-300',
              state === 'amber' && 'text-amber-700 dark:text-amber-300',
              state === 'red' && 'text-red-700 dark:text-red-300',
            )}>
              {state === 'red'
                ? `Факт не внесён ${missedDates.length} дн.`
                : state === 'emerald'
                  ? 'Факт внесён'
                  : 'Внесите факт за сегодня'}
            </span>

            {/* Badge */}
            {state !== 'red' && (
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                state === 'emerald'
                  ? 'bg-emerald-200/80 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300'
                  : 'bg-amber-200/80 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300',
              )}>
                {filledCount}/{totalCount}
              </span>
            )}
          </div>

          {/* Missed dates detail */}
          {state === 'red' && (
            <span className="text-[10px] text-red-600/80 dark:text-red-400/80 truncate block">
              {missedLabel}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className={cn(
          'w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5',
          state === 'emerald' && 'text-emerald-400',
          state === 'amber' && 'text-amber-400',
          state === 'red' && 'text-red-400',
        )} />
      </div>
    </button>
  );
}
