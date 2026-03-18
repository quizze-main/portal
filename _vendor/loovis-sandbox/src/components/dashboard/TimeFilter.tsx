import { cn } from "@/lib/utils";

export type FilterPeriod = '3days' | 'month' | '30clients';

interface TimeFilterProps {
  value: FilterPeriod;
  onChange: (value: FilterPeriod) => void;
  className?: string;
}

const filters: { value: FilterPeriod; label: string }[] = [
  { value: '3days', label: '3 дня' },
  { value: 'month', label: 'Месяц' },
  { value: '30clients', label: '30 кл' },
];

export function TimeFilter({ value, onChange, className }: TimeFilterProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 p-1 bg-secondary rounded-lg",
      className
    )}>
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
            value === filter.value
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
