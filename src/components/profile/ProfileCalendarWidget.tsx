import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmployeeSchedule } from '@/hooks/useEmployeeSchedule';
import { SHIFT_TYPE_COLORS, SHIFT_TYPE_SHORT, type ShiftType } from '@/types/shift-schedule';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { DayDetailSheet } from './DayDetailSheet';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const DOW_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface ProfileCalendarWidgetProps {
  employeeId: string;
  branchId: string | null;
}

interface CalendarDay {
  date: string;
  day: number;
  dow: number; // 0=Mon .. 6=Sun (ISO)
  isCurrentMonth: boolean;
}

export function ProfileCalendarWidget({ employeeId, branchId }: ProfileCalendarWidgetProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const month = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthOffset]);

  const { summary, entries, isLoading } = useEmployeeSchedule(employeeId, month);

  const entriesMap = useMemo(() => {
    const map = new Map<string, (typeof entries)[0]>();
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [entries]);

  const today = new Date().toISOString().slice(0, 10);

  // Build calendar grid (6 weeks max)
  const calendarDays = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const firstDayOfMonth = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();

    // ISO day of week: Monday=0, Sunday=6
    let startDow = firstDayOfMonth.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: CalendarDay[] = [];

    // Previous month padding
    const prevMonth = new Date(y, m - 1, 0);
    const prevDays = prevMonth.getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const day = prevDays - i;
      const pDate = new Date(y, m - 2, day);
      days.push({
        date: formatDate(pDate),
        day,
        dow: days.length % 7,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m - 1, d);
      days.push({
        date: `${month}-${String(d).padStart(2, '0')}`,
        day: d,
        dow: days.length % 7,
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to complete last week)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nDate = new Date(y, m, i);
        days.push({
          date: formatDate(nDate),
          day: i,
          dow: days.length % 7,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [month]);

  const [y, m] = month.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`;

  const handlePrevMonth = useCallback(() => setMonthOffset(p => p - 1), []);
  const handleNextMonth = useCallback(() => setMonthOffset(p => p + 1), []);
  const handleDayClick = useCallback((date: string) => setSelectedDate(date), []);
  const handleSheetClose = useCallback(() => setSelectedDate(null), []);

  const selectedEntry = selectedDate ? entriesMap.get(selectedDate) || null : null;

  if (isLoading && !summary) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Spinner className="w-5 h-5" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalEntries === 0) {
    return null;
  }

  // Today's shift
  const todayEntry = entriesMap.get(today);
  const todayShiftLabel = todayEntry
    ? todayEntry.shift_type === 'work'
      ? `Смена ${todayEntry.shift_number || ''}`
      : { day_off: 'Выходной', vacation: 'Отпуск', sick: 'Больничный', extra_shift: 'Доп. смена', day_off_lieu: 'Отгул', absent: 'Прогул' }[todayEntry.shift_type as ShiftType] || todayEntry.shift_type
    : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Мой график
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium min-w-[100px] text-center">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {DOW_HEADERS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "text-center text-[10px] font-medium py-0.5",
                  i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map(({ date, day, dow, isCurrentMonth }) => {
              const entry = isCurrentMonth ? entriesMap.get(date) : null;
              const shiftType = entry?.shift_type as ShiftType | undefined;
              const colors = shiftType ? SHIFT_TYPE_COLORS[shiftType] : null;
              const isToday = date === today;
              const isWeekend = dow >= 5;
              const shortLabel = shiftType
                ? shiftType === 'work' && entry?.shift_number
                  ? String(entry.shift_number)
                  : SHIFT_TYPE_SHORT[shiftType]
                : '';

              return (
                <button
                  key={date}
                  onClick={() => isCurrentMonth && handleDayClick(date)}
                  disabled={!isCurrentMonth}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-md py-1 min-h-[38px] transition-colors",
                    isCurrentMonth
                      ? "cursor-pointer active:scale-95"
                      : "opacity-30 cursor-default",
                    isToday && "ring-2 ring-primary ring-offset-1",
                    colors
                      ? `${colors.bg} ${colors.text}`
                      : isWeekend && isCurrentMonth
                        ? "bg-muted/40 text-muted-foreground"
                        : "text-muted-foreground/60",
                    isCurrentMonth && !colors && "[@media(hover:hover)]:hover:bg-accent/50"
                  )}
                >
                  <span className={cn(
                    "text-[11px] font-medium leading-tight",
                    isCurrentMonth && "text-foreground"
                  )}>
                    {day}
                  </span>
                  <span className="text-[9px] leading-none h-3 flex items-center">
                    {shortLabel || '\u00A0'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-2 pt-2 border-t">
            <span>
              <span className="font-medium text-foreground">{summary.workDays}</span> смен
            </span>
            <span>
              <span className="font-medium text-foreground">{summary.daysOff}</span> вых
            </span>
            {summary.extraShifts > 0 && (
              <span>
                <span className="font-medium text-green-600 dark:text-green-400">{summary.extraShifts}</span> доп
              </span>
            )}
            {summary.vacations > 0 && (
              <span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{summary.vacations}</span> отп
              </span>
            )}
            {summary.sickDays > 0 && (
              <span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{summary.sickDays}</span> бол
              </span>
            )}
            {todayShiftLabel && (
              <span className="ml-auto">
                Сегодня: <span className="font-medium text-foreground">{todayShiftLabel}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <DayDetailSheet
        open={!!selectedDate}
        onOpenChange={(open) => !open && handleSheetClose()}
        date={selectedDate}
        entry={selectedEntry}
        employeeId={employeeId}
        branchId={branchId}
        month={month}
      />
    </>
  );
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
