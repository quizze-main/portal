import { ChevronRight, Square, RectangleHorizontal } from 'lucide-react';
import { KPIFullWidthCard, FullWidthKPIMetric } from './KPIFullWidthCard';
import { KPICompactCard } from './KPICompactCard';
import { cn } from '@/lib/utils';

interface DraggableFullWidthCardProps {
  metric: FullWidthKPIMetric;
  isEditMode: boolean;
  columnSpan: 1 | 2;
  onColumnSpanChange?: (span: 1 | 2) => void;
  onClick?: () => void;
}

export function DraggableFullWidthCard({
  metric,
  isEditMode,
  columnSpan,
  onColumnSpanChange,
  onClick
}: DraggableFullWidthCardProps) {
  const toggleColumnSpan = (e: React.MouseEvent) => {
    e.stopPropagation();
    onColumnSpanChange?.(columnSpan === 1 ? 2 : 1);
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-200",
        columnSpan === 2 && "col-span-2",
      )}
    >
      {/* Edit mode: size toggle */}
      {isEditMode && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1">
          <button
            onClick={toggleColumnSpan}
            className="p-1.5 rounded-lg bg-secondary text-secondary-foreground shadow-lg"
            title={columnSpan === 1 ? "Развернуть на всю ширину" : "Сжать до половины"}
          >
            {columnSpan === 1 ? (
              <RectangleHorizontal className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Card wrapper */}
      <div
        className={cn(
          "group",
          isEditMode && "ml-6 pointer-events-none is-edit-mode"
        )}
      >
        {columnSpan === 1 ? (
          <KPICompactCard metric={metric} />
        ) : (
          <KPIFullWidthCard metric={metric} />
        )}
      </div>

      {/* Explicit open button (prevents accidental open while scrolling) */}
      {!isEditMode && onClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={cn(
            "absolute top-2 right-2 z-20",
            "h-8 w-8 rounded-full",
            "bg-background/80 backdrop-blur border border-border shadow-sm",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:bg-background",
            "active:scale-95 transition"
          )}
          aria-label="Открыть"
          title="Открыть"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
