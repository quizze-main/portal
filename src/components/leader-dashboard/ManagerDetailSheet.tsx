import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ManagerDetailContent } from '@/pages/leader-dashboard/ManagerDetail';

interface ManagerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managerId: string | null;
}

export function ManagerDetailSheet({ open, onOpenChange, managerId }: ManagerDetailSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Track internal managerId so switching managers inside the sheet works
  const [currentManagerId, setCurrentManagerId] = useState(managerId);

  // Sync with external managerId when sheet opens with a new manager
  useEffect(() => {
    if (managerId) setCurrentManagerId(managerId);
  }, [managerId]);

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

  if (!currentManagerId) return null;

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
            Менеджер
          </SheetTitle>
        </SheetHeader>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto leader-dashboard-theme"
        >
          <ManagerDetailContent
            managerId={currentManagerId}
            embedded
            onBack={() => handleOpenChange(false)}
            onManagerChange={setCurrentManagerId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
