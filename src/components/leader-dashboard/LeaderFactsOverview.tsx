import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useFactsOverview } from '@/hooks/useFactsOverview';
import type { DashboardMetricConfig, LoovisStoreOption } from '@/lib/internalApiClient';
import { DailyFactCards } from './DailyFactCards';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, User, X } from 'lucide-react';

/* ── Helpers ── */

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('ru-RU', { month: 'long' });
  return `${day} ${month}, ${weekday}`;
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function generateMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/* ── Types ── */

interface LeaderFactsOverviewProps {
  metrics: DashboardMetricConfig[];
  branches: LoovisStoreOption[];
  onClose: () => void;
}

/* ── Component ── */

export function LeaderFactsOverview({ metrics, branches, onClose }: LeaderFactsOverviewProps) {
  const queryClient = useQueryClient();
  const manualMetrics = metrics.filter(m => m.source === 'manual' && m.enabled !== false);

  const today = todayStr();
  const [date, setDate] = useState(today);
  const isFutureDate = date > today;
  const isToday = date === today;

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: parseInt(today.slice(0, 4)),
    month: parseInt(today.slice(5, 7)),
  }));

  const calendarDates = useMemo(
    () => generateMonthDates(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month],
  );

  // Month navigation
  const prevMonth = useCallback(() => {
    setCalendarMonth(prev =>
      prev.month === 1 ? { year: prev.year - 1, month: 12 } : { ...prev, month: prev.month - 1 }
    );
  }, []);
  const nextMonth = useCallback(() => {
    setCalendarMonth(prev =>
      prev.month === 12 ? { year: prev.year + 1, month: 1 } : { ...prev, month: prev.month + 1 }
    );
  }, []);

  // When month changes, select today or 1st day
  useEffect(() => {
    const t = todayStr();
    const tYear = parseInt(t.slice(0, 4));
    const tMonth = parseInt(t.slice(5, 7));
    if (calendarMonth.year === tYear && calendarMonth.month === tMonth) {
      setDate(t);
    } else {
      setDate(`${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}-01`);
    }
  }, [calendarMonth]);

  // Auto-scroll to selected date
  const calendarRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selectedDateRef.current && calendarRef.current) {
      selectedDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [date]);

  // Fetch overview for all branches
  const storeIds = useMemo(() => branches.map(b => b.store_id), [branches]);
  const { data: overview, isLoading, isError, error } = useFactsOverview(date, storeIds, !isFutureDate);

  // Expanded branches (accordion)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((storeId: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }, []);

  // Drill-down
  const [drillDownBranch, setDrillDownBranch] = useState<string | null>(null);
  const drillDownBranchObj = branches.find(b => b.store_id === drillDownBranch);

  const handleDrillDownClose = useCallback(() => {
    setDrillDownBranch(null);
    queryClient.invalidateQueries({ queryKey: ['facts-overview'] });
  }, [queryClient]);

  // Count how many branches are filled for the selected date
  const filledCount = useMemo(() => {
    if (!overview?.branches) return 0;
    return Object.values(overview.branches).filter(b => b.filled).length;
  }, [overview]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {/* Calendar strip */}
        <div className="rounded-xl bg-muted/50 py-2">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-3 mb-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold">
              {MONTHS_FULL[calendarMonth.month - 1]} {calendarMonth.year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Selected date label */}
          <div className="text-center mb-1.5 px-3">
            <span className="text-xs text-muted-foreground capitalize">{formatDateLabel(date)}</span>
            {isToday && <span className="ml-1 text-[10px] text-primary font-medium">сегодня</span>}
          </div>

          {/* Horizontal date scroll */}
          <div
            ref={calendarRef}
            className="flex gap-1 overflow-x-auto px-2 pb-1 scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {calendarDates.map(d => {
              const dateObj = new Date(d + 'T00:00:00');
              const dayNum = dateObj.getDate();
              const wd = WEEKDAYS_SHORT[dateObj.getDay()];
              const isSelected = d === date;
              const isTodayDate = d === today;
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isFuture = d > today;

              return (
                <button
                  key={d}
                  ref={isSelected ? selectedDateRef : undefined}
                  type="button"
                  onClick={() => !isFuture && setDate(d)}
                  disabled={isFuture}
                  style={{ minWidth: 'calc((100% - 24px) / 7)' }}
                  className={`flex flex-col items-center shrink-0 py-2 rounded-lg transition-all ${
                    isFuture
                      ? 'opacity-30 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-background/80 text-muted-foreground'
                  }`}
                >
                  <span className={`text-[10px] leading-none ${
                    isSelected ? 'text-primary-foreground/70' : isWeekend ? 'text-rose-400' : 'text-muted-foreground'
                  }`}>
                    {wd}
                  </span>
                  <span className={`text-base font-semibold leading-tight mt-0.5 ${
                    isSelected ? '' : isTodayDate ? 'text-primary' : ''
                  }`}>
                    {dayNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Branch status summary */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            Заполнено: <span className="font-medium text-foreground">{filledCount}</span> из {branches.length} филиалов
          </span>
        </div>

        {/* Branch accordion list */}
        {isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 text-center">
            <p className="text-sm text-red-500">{(error as Error)?.message || 'Ошибка загрузки данных'}</p>
            <p className="text-xs text-muted-foreground mt-1">Попробуйте перезагрузить страницу</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : isFutureDate ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">Нельзя просматривать факт за будущие дни</p>
          </div>
        ) : (
          <div className="space-y-2">
            {branches.map(branch => {
              const branchData = overview?.branches[branch.store_id];
              const isFilled = branchData?.filled ?? false;
              const isExpanded = expandedBranches.has(branch.store_id);
              const employees = branchData?.employees || {};
              const employeeEntries = Object.entries(employees).filter(([id]) => id !== '__unknown__');
              const unknownEmployee = employees['__unknown__'];

              return (
                <div
                  key={branch.store_id}
                  className={`rounded-xl border bg-card overflow-hidden transition-all ${
                    isFilled ? 'border-emerald-200 dark:border-emerald-800' : ''
                  }`}
                >
                  {/* Branch header — click to expand */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(branch.store_id)}
                    className="w-full text-left p-3 flex items-center gap-2 hover:bg-muted/30 transition-colors"
                  >
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
                        isExpanded ? '' : '-rotate-90'
                      }`}
                    />
                    <span className="text-sm font-medium truncate flex-1">{branch.name}</span>
                    {isFilled ? (
                      <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Заполнено
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                        Не заполнено
                      </span>
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* Branch totals */}
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          Итого за день
                        </div>
                        <div className="space-y-1">
                          {manualMetrics.map(m => {
                            const val = branchData?.facts[m.id]?.fact;
                            return (
                              <div key={m.id} className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{m.name}</span>
                                <span className={`text-sm font-medium tabular-nums ${val != null && val > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                  {val != null && val > 0 ? formatNumber(val) : '—'}
                                  {val != null && val > 0 && m.unit && (
                                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{m.unit}</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Month totals */}
                        {branchData?.monthTotals && Object.values(branchData.monthTotals).some(v => v > 0) && (
                          <div className="mt-2 pt-2 border-t border-muted">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              За месяц
                            </div>
                            <div className="space-y-0.5">
                              {manualMetrics.map(m => {
                                const total = branchData.monthTotals[m.id] || 0;
                                return total > 0 ? (
                                  <div key={m.id} className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">{m.name}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                      {formatNumber(total)}
                                      {m.unit && <span className="ml-0.5">{m.unit}</span>}
                                    </span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Employee rows */}
                      {(employeeEntries.length > 0 || unknownEmployee) && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">
                            Сотрудники
                          </div>

                          {employeeEntries.map(([eid, emp]) => (
                            <div
                              key={eid}
                              className={`rounded-lg border p-2.5 ${
                                emp.filled ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-card'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium">{emp.name}</span>
                                </div>
                                {emp.filled ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <X className="w-3 h-3 text-muted-foreground/40" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                {manualMetrics.map(m => {
                                  const val = emp.facts[m.id]?.fact;
                                  return (
                                    <div key={m.id} className="flex items-center justify-between">
                                      <span className="text-[11px] text-muted-foreground">{m.name}</span>
                                      <span className={`text-xs tabular-nums ${val != null ? 'text-foreground font-medium' : 'text-muted-foreground/40'}`}>
                                        {val != null ? formatNumber(val) : '—'}
                                        {val != null && m.unit && (
                                          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{m.unit}</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          {/* Unknown employee (legacy data without employeeId) */}
                          {unknownEmployee && unknownEmployee.filled && (
                            <div className="rounded-lg border border-dashed p-2.5 bg-card">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground/50" />
                                <span className="text-xs font-medium text-muted-foreground">Без автора</span>
                              </div>
                              <div className="space-y-0.5">
                                {manualMetrics.map(m => {
                                  const val = unknownEmployee.facts[m.id]?.fact;
                                  return (
                                    <div key={m.id} className="flex items-center justify-between">
                                      <span className="text-[11px] text-muted-foreground">{m.name}</span>
                                      <span className={`text-xs tabular-nums ${val != null ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                        {val != null ? formatNumber(val) : '—'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Edit button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setDrillDownBranch(branch.store_id)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Редактировать факт
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drill-down Sheet */}
      <Sheet open={!!drillDownBranch} onOpenChange={open => { if (!open) handleDrillDownClose(); }}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-base">{drillDownBranchObj?.name || 'Филиал'}</SheetTitle>
          </SheetHeader>
          {drillDownBranch && (
            <DailyFactCards
              metrics={metrics}
              branches={branches}
              defaultBranchId={drillDownBranch}
              onClose={handleDrillDownClose}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
