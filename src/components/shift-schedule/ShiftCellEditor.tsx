import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, CalendarRange, Clock } from 'lucide-react';
import type { ShiftType, ShiftEntry, ShiftEntryInput } from '@/types/shift-schedule';
import { SHIFT_TYPE_COLORS } from '@/types/shift-schedule';
import { SHIFT_INDICATORS } from './ShiftIndicator';

interface ShiftCellEditorProps {
  entry?: ShiftEntry;
  employeeId: string;
  branchId: string;
  date: string;
  month: string; // "YYYY-MM" — to constrain date range
  children: React.ReactNode;
  onSave: (entry: ShiftEntryInput) => void;
  onBulkSave: (entries: ShiftEntryInput[]) => void;
  onDelete: () => void;
}

const QUICK_TYPES: { type: ShiftType; label: string; number?: number }[] = [
  { type: 'work', label: 'Смена 1', number: 1 },
  { type: 'work', label: 'Смена 2', number: 2 },
  { type: 'day_off', label: 'Выходной' },
  { type: 'sick', label: 'Больничный' },
  { type: 'vacation', label: 'Отпуск' },
  { type: 'extra_shift', label: 'Доп. смена' },
  { type: 'day_off_lieu', label: 'Отгул' },
  { type: 'absent', label: 'Прогул' },
];

/** Generate array of "YYYY-MM-DD" strings between two dates (inclusive), clamped to the given month */
function generateDateRange(from: string, to: string, month: string): string[] {
  const [year, m] = month.split('-').map(Number);
  const monthStart = new Date(year, m - 1, 1);
  const monthEnd = new Date(year, m, 0);

  let start = new Date(from + 'T00:00:00');
  let end = new Date(to + 'T00:00:00');
  if (start > end) [start, end] = [end, start];

  if (start < monthStart) start = monthStart;
  if (end > monthEnd) end = monthEnd;

  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${mm}-${dd}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function ShiftCellEditor({ entry, employeeId, branchId, date, month, children, onSave, onBulkSave, onDelete }: ShiftCellEditorProps) {
  const [open, setOpen] = useState(false);
  const [timeStart, setTimeStart] = useState(entry?.time_start?.slice(0, 5) || '');
  const [timeEnd, setTimeEnd] = useState(entry?.time_end?.slice(0, 5) || '');
  const [periodMode, setPeriodMode] = useState(false);
  const [periodEnd, setPeriodEnd] = useState('');
  const [showTime, setShowTime] = useState(false);

  // Compute max date for the current month
  const [yearNum, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const maxDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const handleQuickSelect = (type: ShiftType, shiftNumber?: number) => {
    const entryData: Omit<ShiftEntryInput, 'date'> = {
      employee_id: employeeId,
      branch_id: branchId,
      shift_type: type,
      shift_number: shiftNumber || null,
      time_start: type === 'work' || type === 'extra_shift' ? (timeStart || null) : null,
      time_end: type === 'work' || type === 'extra_shift' ? (timeEnd || null) : null,
    };

    if (periodMode && periodEnd) {
      const dates = generateDateRange(date, periodEnd, month);
      if (dates.length > 1) {
        onBulkSave(dates.map(d => ({ ...entryData, date: d })));
        setOpen(false);
        return;
      }
    }

    onSave({ ...entryData, date });
    setOpen(false);
  };

  const handleSaveWithTime = () => {
    if (!timeStart || !timeEnd) return;
    const entryData: Omit<ShiftEntryInput, 'date'> = {
      employee_id: employeeId,
      branch_id: branchId,
      shift_type: 'work',
      shift_number: entry?.shift_number || 1,
      time_start: timeStart,
      time_end: timeEnd,
    };

    if (periodMode && periodEnd) {
      const dates = generateDateRange(date, periodEnd, month);
      if (dates.length > 1) {
        onBulkSave(dates.map(d => ({ ...entryData, date: d })));
        setOpen(false);
        return;
      }
    }

    onSave({ ...entryData, date });
    setOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setOpen(false);
  };

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', weekday: 'short',
  });

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        setTimeStart(entry?.time_start?.slice(0, 5) || '');
        setTimeEnd(entry?.time_end?.slice(0, 5) || '');
        setPeriodMode(false);
        setPeriodEnd('');
        setShowTime(!!(entry?.time_start));
      }
    }}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-[272px] p-0 rounded-xl shadow-lg border-border/50" side="bottom" align="center">
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-sm font-semibold text-foreground capitalize">{formattedDate}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTime(!showTime)}
                className={`
                  flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-lg border transition-all duration-200
                  ${showTime
                    ? 'bg-muted border-border text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                  }
                `}
              >
                <Clock className="w-3 h-3" />
              </button>
              <button
                onClick={() => setPeriodMode(!periodMode)}
                className={`
                  flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-lg border transition-all duration-200
                  ${periodMode
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                  }
                `}
              >
                <CalendarRange className="w-3 h-3" />
                <span>Период</span>
              </button>
            </div>
          </div>

          {/* Period end date */}
          {periodMode && (
            <div className="px-3 pb-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground shrink-0">до</span>
                <Input
                  type="date"
                  value={periodEnd}
                  min={date}
                  max={maxDate}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="h-7 text-xs rounded-lg"
                />
              </div>
              {periodEnd && (() => {
                const count = generateDateRange(date, periodEnd, month).length;
                return count > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-md">
                      {count} дн.
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formattedDate} — {new Date(periodEnd + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/40" />

          {/* Quick type buttons */}
          <div className="grid grid-cols-2 gap-1 p-2">
            {QUICK_TYPES.map((qt) => {
              const colors = SHIFT_TYPE_COLORS[qt.type];
              const indicator = SHIFT_INDICATORS[qt.type];
              const Icon = indicator.icon;
              const isActive = entry?.shift_type === qt.type && (qt.number ? entry?.shift_number === qt.number : true);
              return (
                <button
                  key={qt.label}
                  onClick={() => handleQuickSelect(qt.type, qt.number)}
                  className={`
                    flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-all duration-150
                    ${isActive
                      ? `${colors.bg} ${colors.text} font-semibold shadow-sm`
                      : 'hover:bg-muted/60 dark:hover:bg-muted/30 text-foreground/80'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span>{qt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Time range (collapsible) */}
          {showTime && (
            <>
              <div className="border-t border-border/40" />
              <div className="px-3 py-2 space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Время</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                  <span className="text-muted-foreground/50">—</span>
                  <Input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                {timeStart && timeEnd && (
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs rounded-lg"
                    onClick={handleSaveWithTime}
                  >
                    Сохранить с временем
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Delete */}
          {entry && (
            <>
              <div className="border-t border-border/40" />
              <div className="p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-8 text-xs rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/5"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Очистить
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
