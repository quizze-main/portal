import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface AttentionChipItem {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'warning' | 'destructive' | 'primary';
}

interface AttentionChipProps {
  item: AttentionChipItem;
  onClick?: () => void;
}

function getChipStyles(color: AttentionChipItem['color']) {
  switch (color) {
    case 'warning':
      return 'bg-warning/10 border-warning/30 text-warning';
    case 'destructive':
      return 'bg-destructive/10 border-destructive/30 text-destructive';
    case 'primary':
      return 'bg-primary/10 border-primary/30 text-primary';
  }
}

export function AttentionChip({ item, onClick }: AttentionChipProps) {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full border",
        "whitespace-nowrap flex-shrink-0",
        "transition-all duration-200 active:scale-95",
        getChipStyles(item.color)
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{item.label}</span>
      <span className="text-xs font-bold bg-card/50 px-1.5 py-0.5 rounded-full">
        {item.value}
      </span>
    </button>
  );
}