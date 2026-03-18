import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, AlertTriangle, Info } from 'lucide-react';
import type { DayCoverage } from '@/types/staffing-requirements';

interface CoverageDayDetailProps {
  coverage: DayCoverage;
  children: React.ReactNode;
}

function getStatusColor(actual: number, required: number) {
  if (actual >= required) {
    return actual === required
      ? { text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
      : { text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' };
  }
  return actual === 0
    ? { text: 'text-red-500 dark:text-red-400', icon: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' }
    : { text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' };
}

export function CoverageDayDetail({ coverage, children }: CoverageDayDetailProps) {
  if (!coverage.required.length) return <>{children}</>;

  const formattedDate = new Date(coverage.date + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', weekday: 'short',
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0 rounded-xl shadow-lg border-border/50" side="top" align="center">
        <div className="space-y-0">
          <div className="px-3 pt-3 pb-2">
            <div className="text-sm font-semibold text-foreground capitalize">{formattedDate}</div>
          </div>

          <div className="border-t border-border/40" />

          <div className="p-2 space-y-1">
            {coverage.required.map((req) => {
              const actual = coverage.actual.find(a => a.designation === req.designation);
              const actualCount = actual?.employees.length || 0;
              const colors = getStatusColor(actualCount, req.count);
              const missing = Math.max(0, req.count - actualCount);
              const surplus = Math.max(0, actualCount - req.count);

              return (
                <div key={req.designation} className={`px-2.5 py-1.5 rounded-lg ${colors.bg} space-y-0.5`}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {actualCount >= req.count ? (
                        <Check className={`w-3 h-3 ${colors.icon}`} />
                      ) : (
                        <AlertTriangle className={`w-3 h-3 ${colors.icon}`} />
                      )}
                      <span className="font-medium text-foreground">{req.designation}</span>
                    </div>
                    <span className={`font-bold tabular-nums ${colors.text}`}>
                      {actualCount}/{req.count}
                      {surplus > 0 && <span className="text-blue-500"> (+{surplus})</span>}
                    </span>
                  </div>
                  {actual?.employees.length ? (
                    <div className="text-[10px] text-muted-foreground pl-[18px]">
                      {actual.employees.map(e => e.name).join(', ')}
                    </div>
                  ) : null}
                  {missing > 0 && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 pl-[18px]">
                      {actualCount === 0 ? `нужно ${missing}` : `нужен ещё ${missing}`}
                    </div>
                  )}
                </div>
              );
            })}

            {coverage.actual
              .filter(a => !coverage.required.some(r => r.designation === a.designation))
              .map((a) => (
                <div key={a.designation} className="flex items-center gap-1.5 px-2.5 py-1 text-xs opacity-50">
                  <Info className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{a.designation}: {a.employees.length} (доп.)</span>
                </div>
              ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border/40" />
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-muted-foreground">Итого</span>
            <span className={`font-bold ${getStatusColor(coverage.totalScheduled, coverage.totalRequired).text}`}>
              {coverage.totalScheduled}/{coverage.totalRequired}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
