import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ReviewsContent } from '@/pages/Reviews';

interface ReviewsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewsSheet({ open, onOpenChange }: ReviewsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
          <SheetTitle className="text-base font-semibold">
            Отзывы клиентов
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <ReviewsContent embedded onBack={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
