import { cn } from "@/lib/utils";
import { AttentionCard, AttentionItem } from "./AttentionCard";

interface AttentionGridProps {
  items: AttentionItem[];
  onItemClick?: (item: AttentionItem) => void;
  className?: string;
}

export function AttentionGrid({ items, onItemClick, className }: AttentionGridProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
        Требует внимания
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <AttentionCard
            key={item.id}
            item={item}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
