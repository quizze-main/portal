import { cn } from '@/lib/utils';

const STATUS_BLUE = '#3b82f6';
const STATUS_GREEN = '#22C55E';
const STATUS_GOLD = '#EAB308';

interface MetricProgressBarProps {
  current: number;
  plan: number;
  /** Height variant */
  size?: 'sm' | 'md';
  className?: string;
  /** Custom color override for the base (≤100%) segment */
  color?: string;
}

export function MetricProgressBar({ current, plan, size = 'md', className, color }: MetricProgressBarProps) {
  const rawPercent = plan > 0 ? (current / plan) * 100 : 0;
  const percent = Math.round(rawPercent);
  const barWidth = Math.min(Math.max(rawPercent, 0), 100);

  const safeRaw = Math.max(0, rawPercent);
  const blueWidth = safeRaw > 0 ? (Math.min(safeRaw, 100) / safeRaw) * 100 : 0;
  const greenWidthRaw = safeRaw > 100 ? ((Math.min(safeRaw, 200) - 100) / safeRaw) * 100 : 0;
  const goldWidthRaw = safeRaw > 200 ? ((safeRaw - 200) / safeRaw) * 100 : 0;
  const greenWidth = safeRaw > 100 && safeRaw <= 200 ? Math.max(0, 100 - blueWidth) : Math.max(0, greenWidthRaw);
  const goldWidth = safeRaw > 200 ? Math.max(0, 100 - blueWidth - greenWidth) : Math.max(0, goldWidthRaw);

  const heightClass = size === 'sm' ? 'h-1' : 'h-[5px]';

  return {
    percent,
    bar: (
      <div className={cn(heightClass, "bg-muted/50 rounded-full overflow-hidden", className)}>
        {percent > 100 ? (
          <div className="flex h-full w-full">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${goldWidth}%`, backgroundColor: STATUS_GOLD }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${greenWidth}%`, backgroundColor: STATUS_GREEN }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${blueWidth}%`, backgroundColor: color || STATUS_BLUE }}
            />
          </div>
        ) : (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              backgroundColor: color || STATUS_BLUE,
            }}
          />
        )}
      </div>
    ),
  };
}
