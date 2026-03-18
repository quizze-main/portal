import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ShiftCell } from './ShiftCell';
import { ShiftCellEditor } from './ShiftCellEditor';
import { ShiftIndicator, getEntryTitle } from './ShiftIndicator';
import { CoverageRow } from './CoverageRow';
import { SHIFT_TYPE_COLORS } from '@/types/shift-schedule';
import type { ShiftEntry, ShiftEntryInput } from '@/types/shift-schedule';
import type { DayCoverage } from '@/types/staffing-requirements';

interface Employee {
  name: string;
  employee_name: string;
  designation?: string;
}

interface ShiftScheduleGridProps {
  month: string; // "YYYY-MM"
  employees: Employee[];
  entriesMap: Map<string, ShiftEntry>;
  canEdit: boolean;
  onUpsert: (entry: ShiftEntryInput) => void;
  onBulkUpsert: (entries: ShiftEntryInput[]) => void;
  onDelete: (employeeId: string, date: string) => void;
  coverageData?: DayCoverage[];
}

const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

interface DayInfo {
  day: number;
  dateStr: string;
  weekday: number; // 0=Mon ... 6=Sun
  weekdayLabel: string;
  isWeekend: boolean;
  isToday: boolean;
}

function getDaysInMonth(month: string): DayInfo[] {
  const [year, m] = month.split('-').map(Number);
  const daysCount = new Date(year, m, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const days: DayInfo[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dt = new Date(year, m - 1, d);
    const jsDay = dt.getDay(); // 0=Sun, 1=Mon...
    const weekday = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon ... 6=Sun
    days.push({
      day: d,
      dateStr,
      weekday,
      weekdayLabel: WEEKDAY_SHORT[weekday],
      isWeekend: weekday >= 5,
      isToday: dateStr === today,
    });
  }
  return days;
}

function getWorkDaysCount(entries: ShiftEntry[], employeeId: string): number {
  return entries.filter(e =>
    e.employee_id === employeeId &&
    (e.shift_type === 'work' || e.shift_type === 'extra_shift')
  ).length;
}

export function ShiftScheduleGrid({ month, employees, entriesMap, canEdit, onUpsert, onBulkUpsert, onDelete, coverageData }: ShiftScheduleGridProps) {
  const days = useMemo(() => getDaysInMonth(month), [month]);
  const allEntries = useMemo(() => Array.from(entriesMap.values()), [entriesMap]);

  // Resolve branchId from first entry or empty string
  const branchId = useMemo(() => {
    const first = entriesMap.values().next().value;
    return first?.branch_id || '';
  }, [entriesMap]);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <ScrollArea className="w-full">
        <div className="min-w-max">
          <table className="border-collapse w-full text-sm">
            <thead>
              <tr className="bg-muted/40 dark:bg-muted/20">
                <th className="sticky left-0 z-20 bg-muted/80 dark:bg-muted/40 backdrop-blur-sm border-b border-r border-border/40 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[160px]">
                  Сотрудник
                </th>
                {days.map((d) => (
                  <th
                    key={d.day}
                    className={`
                      border-b border-border/40 px-0 py-2 text-center text-[11px] font-medium min-w-[38px]
                      ${d.isWeekend ? 'text-red-500/80 dark:text-red-400/70' : 'text-muted-foreground/70'}
                      ${d.isToday ? 'bg-primary/5 dark:bg-primary/10' : ''}
                    `}
                  >
                    <div className={`font-semibold ${d.isToday ? 'text-primary' : ''}`}>{d.day}</div>
                    <div className="font-normal text-[10px] opacity-70">{d.weekdayLabel}</div>
                  </th>
                ))}
                <th className="sticky right-0 z-20 bg-muted/80 dark:bg-muted/40 backdrop-blur-sm border-b border-l border-border/40 px-2 py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[48px]">
                  Дни
                </th>
              </tr>
            </thead>
            <tbody>
              {coverageData && coverageData.length > 0 && (
                <CoverageRow coverageData={coverageData} />
              )}
              {employees.map((emp, idx) => {
                const workDays = getWorkDaysCount(allEntries, emp.name);
                const isLast = idx === employees.length - 1;
                return (
                  <tr
                    key={emp.name}
                    className={`
                      group/row transition-colors hover:bg-muted/20 dark:hover:bg-muted/10
                      ${!isLast ? 'border-b border-border/30' : ''}
                    `}
                  >
                    {/* Employee name - sticky */}
                    <td className="sticky left-0 z-10 bg-card/95 dark:bg-card/95 backdrop-blur-sm border-r border-border/30 px-3 py-1.5 group-hover/row:bg-muted/20">
                      <div className="text-xs font-medium text-foreground truncate max-w-[150px]">
                        {emp.employee_name}
                      </div>
                      {emp.designation && (
                        <div className="text-[10px] text-muted-foreground/70 truncate max-w-[150px]">
                          {emp.designation}
                        </div>
                      )}
                    </td>

                    {/* Day cells */}
                    {days.map((d) => {
                      const entry = entriesMap.get(`${emp.name}:${d.dateStr}`);

                      if (!canEdit) {
                        return (
                          <ShiftCell
                            key={d.dateStr}
                            entry={entry}
                            isWeekend={d.isWeekend}
                            isToday={d.isToday}
                            canEdit={false}
                          />
                        );
                      }

                      const colors = entry ? SHIFT_TYPE_COLORS[entry.shift_type] : null;
                      return (
                        <ShiftCellEditor
                          key={d.dateStr}
                          entry={entry}
                          employeeId={emp.name}
                          branchId={branchId}
                          date={d.dateStr}
                          month={month}
                          onSave={onUpsert}
                          onBulkSave={onBulkUpsert}
                          onDelete={() => onDelete(emp.name, d.dateStr)}
                        >
                          <td
                            className={`
                              group relative h-10 min-w-[38px] max-w-[44px] text-center text-xs font-medium
                              select-none cursor-pointer transition-all duration-150
                              hover:brightness-90 dark:hover:brightness-125
                              ${colors ? `${colors.bg} ${colors.text}` : (d.isWeekend ? 'bg-muted/20 dark:bg-muted/10' : '')}
                              ${d.isToday ? 'ring-2 ring-primary/40 ring-inset rounded-sm' : ''}
                            `}
                            title={entry ? getEntryTitle(entry) : undefined}
                          >
                            <ShiftIndicator entry={entry} showEmpty={true} />
                          </td>
                        </ShiftCellEditor>
                      );
                    })}

                    {/* Summary column - sticky right */}
                    <td className="sticky right-0 z-10 bg-card/95 dark:bg-card/95 backdrop-blur-sm border-l border-border/30 px-2 py-1 text-center group-hover/row:bg-muted/20">
                      <div className="text-xs font-bold text-foreground tabular-nums">{workDays}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
