import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableSectionItemProps {
  id: string;
  isEditMode: boolean;
  children: React.ReactNode;
  /** Label shown next to drag handle in edit mode */
  label?: string;
  /** Extra classes for the wrapper div (e.g. grid col-span) — applied in both modes */
  className?: string;
}

export function DraggableSectionItem({ id, isEditMode, children, label, className }: DraggableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isEditMode) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        isDragging && "opacity-40 ring-2 ring-dashed ring-primary/50 rounded-xl z-50",
        className,
      )}
    >
      {/* Drag handle bar */}
      <div className="flex items-center gap-2 mb-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary text-primary-foreground shadow-md touch-none cursor-grab active:cursor-grabbing text-xs"
        >
          <GripVertical className="w-3.5 h-3.5" />
          {label && <span className="font-medium">{label}</span>}
        </button>
      </div>
      {children}
    </div>
  );
}
