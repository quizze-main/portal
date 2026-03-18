import { useMemo, useState } from 'react';
import { Users, ChevronLeft, ChevronRight, Check, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DayCoverage } from '@/types/staffing-requirements';

interface StaffingOverviewWidgetProps {
  coverageData: DayCoverage[];
  month: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
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

function getAccentColor(actual: number, required: number) {
  if (actual >= required) return actual === required ? 'border-emerald-400' : 'border-blue-400';
  return actual === 0 ? 'border-red-400' : 'border-amber-400';
}

export function StaffingOverviewWidget({ coverageData }: StaffingOverviewWidgetProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIndex = coverageData.findIndex(c => c.date === todayStr);
  const [selectedIndex, setSelectedIndex] = useState(todayIndex >= 0 ? todayIndex : 0);

  const dayCov = coverageData[selectedIndex];
  const hasAnyRequirements = coverageData.some(c => c.totalRequired > 0);

  const breakdown = useMemo(() => {
    if (!dayCov) return [];
    return dayCov.required.map(req => {
      const actual = dayCov.actual.find(a => a.designation === req.designation);
      const employees = actual?.employees || [];
      const missing = Math.max(0, req.count - employees.length);
      const surplus = Math.max(0, employees.length - req.count);
      return { designation: req.designation, required: req.count, employees, missing, surplus };
    });
  }, [dayCov]);

  const extras = useMemo(() => {
    if (!dayCov) return [];
    return dayCov.actual.filter(a => !dayCov.required.some(r => r.designation === a.designation));
  }, [dayCov]);

  if (!hasAnyRequirements || !dayCov) return null;

  const isToday = dayCov.date === todayStr;
  const accentBorder = getAccentColor(dayCov.totalScheduled, dayCov.totalRequired);
  const totalMissing = dayCov.totalRequired - dayCov.totalScheduled;

  return (
    <div className={`rounded-xl border border-border/50 bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden border-l-[3px] ${accentBorder}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20">
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Смена</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg"
            onClick={() => setSelectedIndex(i => Math.max(0, i - 1))}
            disabled={selectedIndex <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            {formatDate(dayCov.date)}{isToday ? ' (сегодня)' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg"
            onClick={() => setSelectedIndex(i => Math.min(coverageData.length - 1, i + 1))}
            disabled={selectedIndex >= coverageData.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {dayCov.totalRequired === 0 ? (
          <div className="text-xs text-muted-foreground py-2">Нет требований на этот день</div>
        ) : (
          <div className="space-y-1.5">
            {breakdown.map(row => {
              const colors = getStatusColor(row.employees.length, row.required);
              const names = row.employees.map(e => e.name).join(', ');

              return (
                <div key={row.designation} className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg ${colors.bg} transition-colors`}>
                  <div className={`mt-0.5 shrink-0 ${colors.icon}`}>
                    {row.employees.length >= row.required ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{row.designation}</span>
                      <span className={`text-xs font-bold tabular-nums ${colors.text}`}>
                        {row.employees.length}/{row.required}
                        {row.surplus > 0 && <span className="text-blue-500 dark:text-blue-400"> (+{row.surplus})</span>}
                      </span>
                    </div>
                    {names ? (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{names}</div>
                    ) : null}
                    {row.missing > 0 && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        {row.employees.length === 0 ? `нужно ${row.missing}` : `нужен ещё ${row.missing}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {extras.map(extra => (
              <div key={extra.designation} className="flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg opacity-50">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  {extra.designation}: {extra.employees.map(e => e.name).join(', ')}
                  <span className="ml-1">(доп.)</span>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Итого</span>
              <span className={`font-bold ${getStatusColor(dayCov.totalScheduled, dayCov.totalRequired).text}`}>
                {dayCov.totalScheduled}/{dayCov.totalRequired}
                {totalMissing > 0 && (
                  <span className="font-normal text-amber-600 dark:text-amber-400"> — не хватает {totalMissing}</span>
                )}
                {totalMissing < 0 && (
                  <span className="font-normal text-blue-500 dark:text-blue-400"> (+{Math.abs(totalMissing)} доп.)</span>
                )}
                {totalMissing === 0 && (
                  <span className="font-normal text-emerald-600 dark:text-emerald-400"> — укомплектована</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
