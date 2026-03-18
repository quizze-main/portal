import { SHIFT_TYPE_LABELS, SHIFT_TYPE_COLORS } from '@/types/shift-schedule';
import type { ShiftType } from '@/types/shift-schedule';
import { SHIFT_INDICATORS } from './ShiftIndicator';

const LEGEND_ITEMS: ShiftType[] = ['work', 'extra_shift', 'day_off', 'vacation', 'sick', 'day_off_lieu', 'absent'];

export function ShiftLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      {LEGEND_ITEMS.map((type) => {
        const colors = SHIFT_TYPE_COLORS[type];
        const indicator = SHIFT_INDICATORS[type];
        const Icon = indicator.icon;
        return (
          <div
            key={type}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${colors.bg} ${colors.text}`}
          >
            <Icon className="w-3 h-3 opacity-70" />
            {SHIFT_TYPE_LABELS[type]}
          </div>
        );
      })}
    </div>
  );
}
