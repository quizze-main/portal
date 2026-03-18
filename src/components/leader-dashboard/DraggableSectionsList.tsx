import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DraggableSectionsListProps {
  sectionIds: string[];
  isEditMode: boolean;
  onReorder: (newOrder: string[]) => void;
  children: React.ReactNode;
}

export function DraggableSectionsList({
  sectionIds,
  isEditMode,
  onReorder,
  children,
}: DraggableSectionsListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionIds.indexOf(active.id as string);
    const newIndex = sectionIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...sectionIds];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  };

  if (!isEditMode) {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {children}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeId ? (
          <div className="opacity-80 shadow-2xl rounded-xl scale-[1.01] bg-card border p-3">
            <div className="text-sm font-medium text-muted-foreground text-center py-4">
              Перемещение секции…
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
