import React from 'react';
import {
  Clock,
  Moon,
  Plane,
  Thermometer,
  CalendarPlus,
  CalendarOff,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import type { ShiftType, ShiftEntry } from '@/types/shift-schedule';
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_COLORS } from '@/types/shift-schedule';

interface ShiftIndicatorConfig {
  icon: React.FC<{ className?: string }>;
  short: string;
}

export const SHIFT_INDICATORS: Record<ShiftType, ShiftIndicatorConfig> = {
  work:         { icon: Clock,          short: '' },
  extra_shift:  { icon: CalendarPlus,   short: 'ДС' },
  day_off:      { icon: Moon,           short: 'В' },
  vacation:     { icon: Plane,          short: 'О' },
  sick:         { icon: Thermometer,    short: 'Б' },
  day_off_lieu: { icon: CalendarOff,    short: 'От' },
  absent:       { icon: AlertTriangle,  short: 'П' },
};

interface ShiftIndicatorProps {
  entry?: ShiftEntry;
  showEmpty?: boolean; // show "+" for empty cells in edit mode
  size?: 'sm' | 'md';
}

function getTimeDisplay(entry: ShiftEntry): string {
  if (entry.time_start && entry.time_end) {
    const s = entry.time_start.slice(0, 5).replace(':00', '');
    const e = entry.time_end.slice(0, 5).replace(':00', '');
    return `${s}-${e}`;
  }
  if (entry.shift_number) return String(entry.shift_number);
  return '';
}

export function getEntryTitle(entry: ShiftEntry): string {
  const label = SHIFT_TYPE_LABELS[entry.shift_type];
  const parts = [label];
  if (entry.time_start && entry.time_end) {
    parts.push(`${entry.time_start.slice(0, 5)} — ${entry.time_end.slice(0, 5)}`);
  }
  if (entry.note) parts.push(entry.note);
  if (entry.created_by) parts.push(`Автор: ${entry.created_by}`);
  return parts.join('\n');
}

export const ShiftIndicator = React.memo(function ShiftIndicator({ entry, showEmpty, size = 'sm' }: ShiftIndicatorProps) {
  if (!entry) {
    if (showEmpty) {
      return (
        <span className="flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity">
          <Plus className="w-3 h-3" />
        </span>
      );
    }
    return null;
  }

  const config = SHIFT_INDICATORS[entry.shift_type];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  // Work shifts: show icon + time or shift number
  if (entry.shift_type === 'work' || entry.shift_type === 'extra_shift') {
    const timeStr = getTimeDisplay(entry);
    return (
      <span className="flex flex-col items-center justify-center gap-0 leading-none">
        <Icon className={`${iconSize} shrink-0`} />
        {timeStr && (
          <span className="text-[8px] leading-tight mt-0.5 font-semibold">{timeStr}</span>
        )}
        {!timeStr && entry.shift_type === 'extra_shift' && (
          <span className="text-[8px] leading-tight mt-0.5 font-semibold">ДС</span>
        )}
      </span>
    );
  }

  // Non-work shifts: icon only (the color of the cell provides context)
  return (
    <span className="flex items-center justify-center">
      <Icon className={`${iconSize} shrink-0`} />
    </span>
  );
});
