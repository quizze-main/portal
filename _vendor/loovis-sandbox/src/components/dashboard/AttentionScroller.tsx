import { cn } from "@/lib/utils";
import { AttentionChip, AttentionChipItem } from "./AttentionChip";

interface AttentionScrollerProps {
  items: AttentionChipItem[];
  onItemClick?: (item: AttentionChipItem) => void;
  className?: string;
}

export function AttentionScroller({ items, onItemClick, className }: AttentionScrollerProps) {
  if (items.length === 0) return null;
  
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2 px-4">
        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
        Требует внимания
      </h3>
      
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {items.map((item) => (
          <AttentionChip
            key={item.id}
            item={item}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}