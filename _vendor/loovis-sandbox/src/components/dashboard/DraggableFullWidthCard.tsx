import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Square, RectangleHorizontal } from 'lucide-react';
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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: metric.id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    if (!isEditMode && onClick) {
      onClick();
    }
  };

  const toggleColumnSpan = (e: React.MouseEvent) => {
    e.stopPropagation();
    onColumnSpanChange?.(columnSpan === 1 ? 2 : 1);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        columnSpan === 2 && "col-span-2",
        isDragging && "opacity-40 ring-2 ring-dashed ring-primary/50 rounded-xl z-50",
        isEditMode && !isDragging && "animate-wiggle"
      )}
    >
      {/* Edit mode overlay with drag handle and size toggle */}
      {isEditMode && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-lg touch-none cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </button>
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
          isEditMode && "ml-6 pointer-events-none"
        )}
        onClick={handleClick}
      >
        {columnSpan === 1 ? (
          <KPICompactCard metric={metric} />
        ) : (
          <KPIFullWidthCard metric={metric} />
        )}
      </div>
    </div>
  );
}
