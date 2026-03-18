import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSetPlan } from '@/hooks/useSetPlan';
import { useFactHistory } from '@/hooks/useFactHistory';
import { internalApiClient } from '@/lib/internalApiClient';
import type { DashboardMetricConfig, LoovisStoreOption } from '@/lib/internalApiClient';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Lock, Loader2, Save } from 'lucide-react';

/* ── Helpers ── */

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('ru-RU', { month: 'long' });
  return `${day} ${month}, ${weekday}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

/** Format input value with space separators: 10000 → "10 000" */
function formatInputValue(raw: string): string {
  if (!raw) return '';
  // Preserve minus, digits, dot/comma
  const cleaned = raw.replace(/[^0-9.,\-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return raw;
  // Split integer and decimal parts
  const parts = cleaned.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

/** Strip spaces to get raw numeric string */
function stripSpaces(val: string): string {
  return val.replace(/\s/g, '');
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** Generate all dates for a calendar month (1-based month) */
function generateMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/* ── Types ── */

interface DailyFactCardsProps {
  metrics: DashboardMetricConfig[];
  branches: LoovisStoreOption[];
  defaultBranchId: string;
  onClose: () => void;
}

interface CardState {
  value: string;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
}

/* ── Component ── */

export function DailyFactCards({ metrics, branches, defaultBranchId, onClose }: DailyFactCardsProps) {
  const { submitDailyFacts } = useSetPlan();
  const queryClient = useQueryClient();

  const manualMetrics = metrics.filter(m => m.source === 'manual' && m.enabled !== false);
  const branchId = defaultBranchId;
  const branch = branches.find(b => b.store_id === branchId);

  const [date, setDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [monthTotals, setMonthTotals] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [allSaved, setAllSaved] = useState(false);

  // Track the last saved/loaded value per metric to correctly compute month total deltas
  const lastSavedValues = useRef<Record<string, number>>({});

  const today = todayStr();
  const isToday = date === today;
  const isFutureDate = date > today;

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: parseInt(today.slice(0, 4)),
    month: parseInt(today.slice(5, 7)),
  }));

  const calendarDates = useMemo(
    () => generateMonthDates(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month],
  );

  // Calculate how many days back from today to cover this month
  const historyDays = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(calendarMonth.year, calendarMonth.month - 1, 1);
    const diffMs = now.getTime() - monthStart.getTime();
    return Math.min(Math.max(Math.ceil(diffMs / 86400000) + 1, calendarDates.length), 90);
  }, [calendarMonth, calendarDates.length]);

  const { data: historyData } = useFactHistory(branchId, historyDays);
  const filledDatesSet = useMemo(
    () => new Set(historyData?.recentDates || []),
    [historyData?.recentDates],
  );

  // Lookup: date → metricId → fact value
  const factsByDate = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    if (!historyData?.history) return map;
    for (const [metricId, metricData] of Object.entries(historyData.history)) {
      for (const entry of metricData.entries) {
        if (!map[entry.date]) map[entry.date] = {};
        map[entry.date][metricId] = entry.fact;
      }
    }
    return map;
  }, [historyData]);

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

  // When month changes, select today (if current month) or 1st day
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

  // Load facts for current date
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAllSaved(false);

    internalApiClient.getDailyFacts(date, branchId)
      .then((result) => {
        if (cancelled) return;
        const newCards: Record<string, CardState> = {};
        for (const m of manualMetrics) {
          const existing = result.facts[m.id];
          newCards[m.id] = {
            value: existing ? String(existing.fact) : '',
            saving: false,
            saved: false,
            dirty: false,
          };
        }
        setCards(newCards);
        setMonthTotals(result.monthTotals || {});
        // Store loaded values as baseline for delta calculations
        const loaded: Record<string, number> = {};
        for (const m of manualMetrics) {
          const existing = result.facts[m.id];
          loaded[m.id] = existing ? existing.fact : 0;
        }
        lastSavedValues.current = loaded;
      })
      .catch(() => {
        if (cancelled) return;
        const newCards: Record<string, CardState> = {};
        for (const m of manualMetrics) {
          newCards[m.id] = { value: '', saving: false, saved: false, dirty: false };
        }
        setCards(newCards);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [date, branchId]);

  // Auto-save single metric with debounce
  const saveMetric = useCallback(async (metricId: string, value: number) => {
    setCards(prev => ({ ...prev, [metricId]: { ...prev[metricId], saving: true, saved: false } }));
    try {
      await submitDailyFacts({ date, storeId: branchId, entries: [{ metricId, fact: value }] });
      setCards(prev => ({ ...prev, [metricId]: { ...prev[metricId], saving: false, saved: true, dirty: false } }));
      // Update month total using stable ref for delta
      setMonthTotals(prev => {
        const oldTotal = prev[metricId] || 0;
        const prevSaved = lastSavedValues.current[metricId] || 0;
        lastSavedValues.current[metricId] = value;
        return { ...prev, [metricId]: oldTotal - prevSaved + value };
      });
      // Refresh calendar history data
      queryClient.invalidateQueries({ queryKey: ['fact-history'] });
      setTimeout(() => {
        setCards(prev => prev[metricId] ? { ...prev, [metricId]: { ...prev[metricId], saved: false } } : prev);
      }, 2000);
    } catch {
      setCards(prev => ({ ...prev, [metricId]: { ...prev[metricId], saving: false } }));
    }
  }, [date, branchId, submitDailyFacts]);

  const handleValueChange = useCallback((metricId: string, raw: string) => {
    setCards(prev => ({ ...prev, [metricId]: { ...prev[metricId], value: raw, dirty: true, saved: false } }));
    setAllSaved(false);
  }, []);

  // Confirm (save) a single metric — triggered by checkmark button
  const handleConfirmMetric = useCallback((metricId: string) => {
    const card = cards[metricId];
    if (!card?.dirty) return;
    const num = parseFloat(card.value);
    if (!isNaN(num) && num >= 0) {
      saveMetric(metricId, num);
    }
  }, [cards, saveMetric]);

  // Save all dirty cards at once
  const handleSaveAll = useCallback(async () => {
    const dirtyEntries = manualMetrics
      .filter(m => cards[m.id]?.dirty)
      .map(m => ({ metricId: m.id, fact: parseFloat(cards[m.id].value) || 0 }))
      .filter(e => !isNaN(e.fact));

    if (dirtyEntries.length === 0) return;

    setSavingAll(true);
    try {
      await submitDailyFacts({ date, storeId: branchId, entries: dirtyEntries });
      setCards(prev => {
        const next = { ...prev };
        for (const e of dirtyEntries) {
          next[e.metricId] = { ...next[e.metricId], saving: false, saved: true, dirty: false };
        }
        return next;
      });
      setAllSaved(true);
      queryClient.invalidateQueries({ queryKey: ['fact-history'] });
      setTimeout(() => setAllSaved(false), 2000);
    } catch { /* */ }
    setSavingAll(false);
  }, [cards, manualMetrics, date, branchId, submitDailyFacts, queryClient]);

  const hasDirty = manualMetrics.some(m => cards[m.id]?.dirty);

  if (manualMetrics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Нет ручных метрик для ввода факта</p>
          <Button variant="outline" size="sm" className="rounded-full px-6" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {/* Scrollable calendar strip */}
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
          {/* Metric totals as mini-cards */}
          {Object.keys(monthTotals).length > 0 && (
            <div className="flex gap-1.5 px-3 mb-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {manualMetrics.map(m => (
                <div
                  key={m.id}
                  className="flex-1 min-w-0 rounded-lg bg-white dark:bg-card border px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color || '#3b82f6' }} />
                    <span className="text-[10px] text-muted-foreground truncate">{m.name}</span>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {formatNumber(monthTotals[m.id] || 0)}
                    {m.unit && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{m.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Selected date label */}
          <div className="text-center mb-1.5 px-3">
            <span className="text-xs text-muted-foreground capitalize">{formatDateLabel(date)}</span>
            {isToday && <span className="ml-1 text-[10px] text-primary font-medium">сегодня</span>}
          </div>
          {/* Horizontal date scroll — ~7 days visible, full month scrollable */}
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
              const isFilled = filledDatesSet.has(d);
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
                        : isFilled
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-foreground hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
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
                  {/* Metric values under day number */}
                  {manualMetrics.length > 0 && (
                    <div className="mt-1 flex flex-col items-center gap-px w-full">
                      {manualMetrics.slice(0, 4).map(m => {
                        const val = factsByDate[d]?.[m.id];
                        return (
                          <span
                            key={m.id}
                            className={`text-[9px] tabular-nums leading-tight truncate max-w-full px-0.5 ${
                              isSelected
                                ? 'text-primary-foreground/70'
                                : val != null
                                  ? 'text-foreground/70'
                                  : 'text-muted-foreground/30'
                            }`}
                          >
                            {val != null ? formatNumber(val) : '—'}
                          </span>
                        );
                      })}
                      {manualMetrics.length > 4 && (
                        <span className={`text-[8px] ${isSelected ? 'text-primary-foreground/50' : 'text-muted-foreground/40'}`}>
                          +{manualMetrics.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Branch label */}
        {branch && (
          <p className="text-[11px] text-muted-foreground text-center">{branch.name}</p>
        )}

        {/* Future date block */}
        {isFutureDate && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
            <Lock className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Нельзя вводить факт за будущие дни</p>
          </div>
        )}

        {!isFutureDate && loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
                <div className="h-3 w-24 bg-muted rounded mb-3" />
                <div className="h-11 bg-muted rounded-xl" />
                <div className="h-2 w-32 bg-muted rounded mt-3" />
              </div>
            ))}
          </div>
        )}

        {!isFutureDate && !loading && (
          /* Metric cards — sorted: unfilled first, filled (completed) last */
          [...manualMetrics]
            .sort((a, b) => {
              const aCard = cards[a.id];
              const bCard = cards[b.id];
              const aFilled = aCard && aCard.value !== '' && !aCard.dirty;
              const bFilled = bCard && bCard.value !== '' && !bCard.dirty;
              if (aFilled === bFilled) return 0;
              return aFilled ? 1 : -1;
            })
            .map(metric => {
              const card = cards[metric.id] || { value: '', saving: false, saved: false, dirty: false };
              const total = monthTotals[metric.id] || 0;
              const unitLabel = metric.unit || '';
              const isFilled = card.value !== '' && !card.dirty;

              // Filled card — compact, greyed out, with checkmark
              if (isFilled) {
                return (
                  <div key={metric.id} className="rounded-xl border bg-muted/40 overflow-hidden opacity-70 transition-all">
                    <div className="px-4 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metric.color || '#3b82f6' }} />
                      <span className="text-sm text-muted-foreground">{metric.name}</span>
                      <span className="ml-auto text-sm font-semibold tabular-nums text-muted-foreground">
                        {formatInputValue(card.value)}
                        {unitLabel && <span className="text-xs font-normal ml-1">{unitLabel}</span>}
                      </span>
                    </div>
                  </div>
                );
              }

              // Unfilled card — full input with confirm button
              return (
                <div key={metric.id} className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all">
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: metric.color || '#3b82f6' }} />
                      <span className="text-sm font-medium text-foreground">{metric.name}</span>
                      <div className="ml-auto flex items-center">
                        {card.saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        {card.saved && !card.saving && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={formatInputValue(card.value)}
                          onChange={(e) => handleValueChange(metric.id, stripSpaces(e.target.value))}
                          className="h-12 rounded-xl text-lg font-semibold tabular-nums pr-14 pl-4"
                        />
                        {unitLabel && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                            {unitLabel}
                          </span>
                        )}
                      </div>
                      {/* Confirm button */}
                      <Button
                        variant={card.dirty ? 'default' : 'outline'}
                        size="icon"
                        className="h-12 w-12 rounded-xl shrink-0"
                        disabled={!card.dirty || card.saving}
                        onClick={() => handleConfirmMetric(metric.id)}
                      >
                        {card.saving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Check className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Month-to-date context */}
                  <div className="px-4 py-2 bg-muted/30 border-t">
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Итого за месяц: <span className="font-medium text-foreground">{formatNumber(total)}</span>
                      {unitLabel && ` ${unitLabel}`}
                    </p>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-background shrink-0">
        {isFutureDate ? (
          <p className="text-center text-sm text-muted-foreground py-2">Выберите сегодня или прошедший день</p>
        ) : allSaved ? (
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-2">
            <Check className="h-4 w-4" />Все данные сохранены
          </div>
        ) : (
          <Button
            className="w-full h-11 rounded-xl text-sm font-medium"
            disabled={!hasDirty || savingAll}
            onClick={handleSaveAll}
          >
            {savingAll ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Сохраняю…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Сохранить всё</>
            )}
          </Button>
        )}
      </div>
    </>
  );
}
