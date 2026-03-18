import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** Percentage value (0-∞). `undefined`, `null`, `NaN`, or negative values are coerced to 0. */
  value?: number | null;
  /** Extra classes for the outer container. */
  className?: string;
  /** Extra classes for the inner (filled) bar (use to set the color). */
  barClassName?: string;
}

/**
 * Accessible and defensive progress-bar component.
 *  • Guards against invalid input (undefined, NaN, <0, >100).
 *  • Clamps width to 100 % but still reports the real value via `aria-valuenow`.
 *  • Ensures visibility for tiny percentages with `min-width:4px`.
 *  • Color is defined only via `barClassName`; no hard-coded palette.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ value, className, barClassName }) => {
  // Sanitize incoming value
  const numeric = Number(value);
  const safePercent = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;

  // Width is clamped to 100 % but we still expose the real percentage via aria
  const widthPercent = Math.min(safePercent, 100);

  return (
    <div
      className={cn("relative w-full h-[5px] bg-gray-200 rounded-full overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full rounded-full transition-all duration-300",
          // Fallback to neutral grey if no color supplied
          barClassName ?? "bg-gray-500"
        )}
        style={{ width: `${widthPercent}%`, minWidth: safePercent > 0 ? 4 : undefined }}
      />
    </div>
  );
};

export default ProgressBar; 