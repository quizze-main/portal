import { cn } from '@/lib/utils';
import { DateRangeFilter } from './DateRangeFilter';
import { DateRange } from 'react-day-picker';

export type FilterPeriod = 'day' | '3days' | 'month' | 'year' | '30clients';

interface FilterBarProps {
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  editControls?: React.ReactNode;
}

const periodFilters: { value: FilterPeriod; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: '3days', label: '3 дня' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
];

export function FilterBar({
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange,
  className,
  editControls
}: FilterBarProps) {
  return (
    <div className={cn(
      // Важно: не добавляем лишний левый padding, чтобы фильтры начинались по линии контента
      "flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-0 bg-muted/50 rounded-xl",
      className
    )}>
      {/* Date + Period filters - scrollable on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
        <DateRangeFilter
          value={dateRange}
          onChange={onDateRangeChange}
        />
        
        <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg flex-shrink-0">
          {periodFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onPeriodChange(filter.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap",
                period === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Edit controls */}
      {editControls && (
        <div className="flex items-center flex-shrink-0">
          {editControls}
        </div>
      )}
    </div>
  );
}
