import React from 'react';
import type { ShiftEntry } from '@/types/shift-schedule';
import { SHIFT_TYPE_COLORS } from '@/types/shift-schedule';
import { ShiftIndicator, getEntryTitle } from './ShiftIndicator';

interface ShiftCellProps {
  entry?: ShiftEntry;
  isWeekend: boolean;
  isToday: boolean;
  canEdit: boolean;
  onClick?: () => void;
}

export const ShiftCell = React.memo(function ShiftCell({ entry, isWeekend, isToday, canEdit, onClick }: ShiftCellProps) {
  const colors = entry ? SHIFT_TYPE_COLORS[entry.shift_type] : null;

  return (
    <td
      className={`
        group relative h-10 min-w-[38px] max-w-[44px] text-center text-xs font-medium
        select-none transition-all duration-150
        ${colors ? `${colors.bg} ${colors.text}` : (isWeekend ? 'bg-muted/20 dark:bg-muted/10' : '')}
        ${isToday ? 'ring-2 ring-primary/40 ring-inset rounded-sm' : ''}
        ${canEdit ? 'cursor-pointer hover:brightness-90 dark:hover:brightness-125' : ''}
      `}
      onClick={canEdit ? onClick : undefined}
      title={entry ? getEntryTitle(entry) : undefined}
    >
      <ShiftIndicator entry={entry} showEmpty={canEdit} />
    </td>
  );
});
