import { useRef, useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MetricDetailContent } from '@/pages/leader-dashboard/MetricDetail';

interface MetricDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId: string | null;
  /** Optional title override; falls back to metric name inside the content */
  title?: string;
  /** Called when user clicks a manager inside the metric detail */
  onManagerClick?: (managerId: string) => void;
}

export function MetricDetailSheet({ open, onOpenChange, metricId, title, onManagerClick }: MetricDetailSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Expand to full screen once user scrolls past 10px
    if (el.scrollTop > 10 && !isExpanded) {
      setIsExpanded(true);
    }
    // Collapse back when scrolled to top
    if (el.scrollTop === 0 && isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setIsExpanded(false);
    onOpenChange(open);
  }, [onOpenChange]);

  if (!metricId) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className={`p-0 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isExpanded
            ? 'h-[100vh] rounded-none'
            : 'h-[92vh] rounded-t-2xl'
        }`}
      >
        <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
          <SheetTitle className="text-base font-semibold">
            {title || 'Детализация метрики'}
          </SheetTitle>
        </SheetHeader>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <MetricDetailContent
            metricId={metricId}
            onBack={() => handleOpenChange(false)}
            onManagerClick={onManagerClick}
            embedded
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
