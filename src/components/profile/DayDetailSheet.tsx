import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EmployeeAvatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/Spinner';
import { useShiftDayCrew } from '@/hooks/useShiftDayCrew';
import { useQueryClient } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPE_COLORS,
  type ShiftType,
  type ShiftEntryInput,
} from '@/types/shift-schedule';
import { ShiftCellEditor } from '@/components/shift-schedule/ShiftCellEditor';
import { Clock, Edit2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTH_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  entry: {
    shift_type: string;
    shift_number: number | null;
    time_start: string | null;
    time_end: string | null;
    note: string;
    id: string;
    employee_id: string;
    branch_id: string;
    date: string;
  } | null;
  employeeId: string;
  branchId: string | null;
  month: string;
}

export function DayDetailSheet({
  open,
  onOpenChange,
  date,
  entry,
  employeeId,
  branchId,
  month,
}: DayDetailSheetProps) {
  const queryClient = useQueryClient();
  const { crew, isLoading: crewLoading } = useShiftDayCrew(branchId, date, open);

  // Filter out the current employee from crew
  const crewmates = crew.filter(c => c.employee_id !== employeeId);

  // Format date heading
  const dateHeading = date ? formatDateHeading(date) : '';
  const shiftType = entry?.shift_type as ShiftType | undefined;
  const colors = shiftType ? SHIFT_TYPE_COLORS[shiftType] : null;
  const shiftLabel = shiftType ? SHIFT_TYPE_LABELS[shiftType] : null;
  const timeRange = entry?.time_start && entry?.time_end
    ? `${entry.time_start} – ${entry.time_end}`
    : null;

  const handleSave = async (input: ShiftEntryInput) => {
    await internalApiClient.upsertShiftEntry(input);
    queryClient.invalidateQueries({ queryKey: ['employeeSchedule'] });
    queryClient.invalidateQueries({ queryKey: ['shift-day-crew'] });
  };

  const handleBulkSave = async (inputs: ShiftEntryInput[]) => {
    await internalApiClient.bulkUpsertShiftEntries(inputs);
    queryClient.invalidateQueries({ queryKey: ['employeeSchedule'] });
    queryClient.invalidateQueries({ queryKey: ['shift-day-crew'] });
  };

  const handleDelete = async () => {
    if (!date) return;
    await internalApiClient.deleteShiftEntry(employeeId, date);
    queryClient.invalidateQueries({ queryKey: ['employeeSchedule'] });
    queryClient.invalidateQueries({ queryKey: ['shift-day-crew'] });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base">{dateHeading}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-4">
          {/* Current employee's shift */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Ваша смена</h4>
            {entry ? (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                colors ? `${colors.bg} ${colors.text}` : "bg-muted"
              )}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {shiftLabel}
                    {entry.shift_number ? ` ${entry.shift_number}` : ''}
                  </div>
                  {timeRange && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs opacity-80">
                      <Clock className="w-3 h-3" />
                      {timeRange}
                    </div>
                  )}
                  {entry.note && (
                    <div className="text-xs mt-1 opacity-70">{entry.note}</div>
                  )}
                </div>

                {branchId && date && (
                  <ShiftCellEditor
                    entry={entry as any}
                    employeeId={employeeId}
                    branchId={branchId}
                    date={date}
                    month={month}
                    onSave={handleSave}
                    onBulkSave={handleBulkSave}
                    onDelete={handleDelete}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </ShiftCellEditor>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground flex-1">Не назначена</span>
                {branchId && date && (
                  <ShiftCellEditor
                    employeeId={employeeId}
                    branchId={branchId}
                    date={date}
                    month={month}
                    onSave={handleSave}
                    onBulkSave={handleBulkSave}
                    onDelete={handleDelete}
                  >
                    <Button variant="outline" size="sm">
                      Назначить
                    </Button>
                  </ShiftCellEditor>
                )}
              </div>
            )}
          </div>

          {/* Crewmates */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              На смене
              {!crewLoading && crewmates.length > 0 && (
                <span className="text-muted-foreground/60">({crewmates.length})</span>
              )}
            </h4>

            {crewLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="w-4 h-4" />
              </div>
            ) : crewmates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                Нет данных о коллегах на смене
              </div>
            ) : (
              <div className="space-y-1.5">
                {crewmates.map(mate => (
                  <div
                    key={mate.employee_id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <EmployeeAvatar
                      name={mate.employee_name}
                      image={mate.image || undefined}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{mate.employee_name}</div>
                      {mate.designation && (
                        <div className="text-xs text-muted-foreground truncate">{mate.designation}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {mate.shift_number && (
                        <div className="text-xs font-medium">Смена {mate.shift_number}</div>
                      )}
                      {mate.time_start && mate.time_end && (
                        <div className="text-xs text-muted-foreground">
                          {mate.time_start}–{mate.time_end}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatDateHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = DAY_NAMES[dateObj.getDay()];
  return `${d} ${MONTH_GENITIVE[m - 1]}, ${dayName}`;
}
