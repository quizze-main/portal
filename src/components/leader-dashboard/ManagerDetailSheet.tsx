import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ManagerDetailContent } from '@/pages/leader-dashboard/ManagerDetail';
import { useState, useEffect } from 'react';

interface ManagerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managerId: string | null;
}

export function ManagerDetailSheet({ open, onOpenChange, managerId }: ManagerDetailSheetProps) {
  // Track internal managerId so switching managers inside the sheet works
  const [currentManagerId, setCurrentManagerId] = useState(managerId);

  // Sync with external managerId when sheet opens with a new manager
  useEffect(() => {
    if (managerId) setCurrentManagerId(managerId);
  }, [managerId]);

  if (!currentManagerId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
          <SheetTitle className="text-base font-semibold">
            Менеджер
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <ManagerDetailContent
            managerId={currentManagerId}
            embedded
            onBack={() => onOpenChange(false)}
            onManagerChange={setCurrentManagerId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
