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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { FullWidthKPIMetric, KPIFullWidthCard } from './KPIFullWidthCard';
import { KPICompactCard } from './KPICompactCard';
import { DraggableFullWidthCard } from './DraggableFullWidthCard';
import { MetricLayoutItem } from '@/hooks/useMetricsLayout';
import { cn } from '@/lib/utils';

interface DraggableMetricsGridProps {
  metrics: FullWidthKPIMetric[];
  isEditMode: boolean;
  layoutItems: MetricLayoutItem[];
  onLayoutChange: (items: MetricLayoutItem[]) => void;
  onColumnSpanChange?: (metricId: string, span: 1 | 2) => void;
  onMetricClick?: (metric: FullWidthKPIMetric) => void;
}

export function DraggableMetricsGrid({
  metrics,
  isEditMode,
  layoutItems,
  onLayoutChange,
  onColumnSpanChange,
  onMetricClick,
}: DraggableMetricsGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = layoutItems.findIndex(item => item.id === active.id);
    const newIndex = layoutItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = [...layoutItems];
    const [movedItem] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movedItem);

    // Recalculate order indices
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      rowIndex: index,
      order: 0,
    }));
    
    onLayoutChange(updatedItems);
  };

  // Sort metrics according to layout - by rowIndex
  const sortedMetrics = [...metrics].sort((a, b) => {
    const aLayout = layoutItems.find(item => item.id === a.id);
    const bLayout = layoutItems.find(item => item.id === b.id);
    if (!aLayout || !bLayout) return 0;
    return aLayout.rowIndex - bLayout.rowIndex;
  });

  const getColumnSpan = (metricId: string): 1 | 2 => {
    const item = layoutItems.find(i => i.id === metricId);
    return item?.columnSpan ?? 2;
  };

  const activeMetric = activeId ? metrics.find(m => m.id === activeId) : null;
  const activeColumnSpan = activeId ? getColumnSpan(activeId) : 2;

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedMetrics.map(m => m.id)}
        strategy={rectSortingStrategy}
      >
        <div className={cn(
          "grid grid-cols-2 gap-2",
          "md:grid-cols-3 md:gap-3",
          "lg:grid-cols-4 lg:gap-4",
          "xl:grid-cols-5",
          "2xl:grid-cols-6",
          isEditMode && "p-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5"
        )}>
          {sortedMetrics.map((metric) => (
            <DraggableFullWidthCard
              key={metric.id}
              metric={metric}
              isEditMode={isEditMode}
              columnSpan={getColumnSpan(metric.id)}
              onColumnSpanChange={(span) => onColumnSpanChange?.(metric.id, span)}
              onClick={() => onMetricClick?.(metric)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeMetric ? (
          <div className={cn(
            "opacity-95 shadow-2xl rounded-xl scale-[1.02]",
            activeColumnSpan === 2 ? "w-full" : "w-[calc(50vw-1.5rem)]"
          )}>
            {activeColumnSpan === 1 ? (
              <KPICompactCard metric={activeMetric} />
            ) : (
              <KPIFullWidthCard metric={activeMetric} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
