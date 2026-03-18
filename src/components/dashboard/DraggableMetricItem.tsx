import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DraggableMetricItemProps {
  id: string;
  isEditMode: boolean;
  children: ReactNode;
  className?: string;
}

export function DraggableMetricItem({ 
  id, 
  isEditMode, 
  children,
  className 
}: DraggableMetricItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "z-50 opacity-90 scale-105 shadow-lg",
        className
      )}
    >
      {isEditMode && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded bg-primary/10 hover:bg-primary/20 cursor-grab active:cursor-grabbing transition-colors"
          aria-label="Перетащить"
        >
          <GripVertical className="w-3 h-3 text-primary" />
        </button>
      )}
      {children}
    </div>
  );
}
