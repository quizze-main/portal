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
  if (!metricId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
          <SheetTitle className="text-base font-semibold">
            {title || 'Детализация метрики'}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <MetricDetailContent
            metricId={metricId}
            onBack={() => onOpenChange(false)}
            onManagerClick={onManagerClick}
            embedded
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
