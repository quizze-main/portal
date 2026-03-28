import { useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployeeSchedule } from '@/hooks/useEmployeeSchedule';
import { SHIFT_TYPE_COLORS, SHIFT_TYPE_SHORT, SHIFT_TYPE_LABELS, type ShiftType } from '@/types/shift-schedule';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { useNavigate } from 'react-router-dom';

interface ProfileScheduleWidgetProps {
  employeeId: string;
}

export function ProfileScheduleWidget({ employeeId }: ProfileScheduleWidgetProps) {
  const navigate = useNavigate();
  const { summary, entries, isLoading, month } = useEmployeeSchedule(employeeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a map of date -> entry for O(1) lookup
  const entriesMap = useMemo(() => {
    const map = new Map<string, typeof entries[0]>();
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [entries]);

  // Generate all days of the month
  const days = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const result: Array<{ date: string; day: number; dow: number }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(y, m - 1, d);
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      result.push({ date: dateStr, day: d, dow: dateObj.getDay() });
    }
    return result;
  }, [month]);

  const today = new Date().toISOString().slice(0, 10);

  // Auto-scroll to today
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayEl = scrollRef.current.querySelector('[data-today="true"]');
    if (todayEl) {
      todayEl.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [entries, month]);

  // Today's shift
  const todayEntry = entriesMap.get(today);
  const todayLabel = todayEntry
    ? SHIFT_TYPE_LABELS[todayEntry.shift_type as ShiftType] || todayEntry.shift_type
    : null;

  const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center">
          <Spinner className="w-5 h-5" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalEntries === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            Мой график
          </CardTitle>
          <button
            onClick={() => navigate('/shift-schedule')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            Подробнее
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2">
        {/* Day strip */}
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin"
        >
          {days.map(({ date, day, dow }) => {
            const entry = entriesMap.get(date);
            const shiftType = entry?.shift_type as ShiftType | undefined;
            const colors = shiftType ? SHIFT_TYPE_COLORS[shiftType] : null;
            const shortLabel = shiftType ? SHIFT_TYPE_SHORT[shiftType] : '';
            const isToday = date === today;
            const isWeekend = dow === 0 || dow === 6;

            return (
              <div
                key={date}
                data-today={isToday ? 'true' : undefined}
                className={`
                  flex-shrink-0 w-8 flex flex-col items-center rounded-md py-0.5 text-[10px]
                  ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                  ${colors ? `${colors.bg} ${colors.text}` : isWeekend ? 'bg-muted/50 text-muted-foreground' : 'bg-background text-muted-foreground/60'}
                `}
              >
                <span className="text-[9px] leading-none opacity-70">{DOW_LABELS[dow]}</span>
                <span className="font-medium leading-tight">{day}</span>
                <span className="leading-none h-3 flex items-center">
                  {shiftType === 'work' && entry?.shift_number
                    ? entry.shift_number
                    : shortLabel || '\u00A0'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary line */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
          {todayLabel && (
            <span className="ml-auto">
              Сегодня: <span className="font-medium text-foreground">{todayLabel}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
