import { cn } from '@/lib/utils';
import { DateRangeFilter } from './DateRangeFilter';
import { DateRange } from 'react-day-picker';
import { isValidDateRange, getDateRangeSummary } from '@/lib/dateRangeUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

export type FilterPeriod = 'day' | '3days' | 'month' | 'year' | '10clients' | '20clients' | '30clients' | '50clients';

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

const clientFilters: { value: FilterPeriod; label: string }[] = [
  { value: '10clients', label: '10 кл' },
  { value: '20clients', label: '20 кл' },
  { value: '30clients', label: '30 кл' },
  { value: '50clients', label: '50 кл' },
];

export function FilterBar({
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange,
  className,
  editControls
}: FilterBarProps) {
  // Check if custom date range is active
  const isCustomRangeActive = isValidDateRange(dateRange);
  const rangeSummary = getDateRangeSummary(dateRange);
  
  // Check if a client period is selected
  const isClientPeriodActive = ['10clients', '20clients', '30clients', '50clients'].includes(period);
  const selectedClientLabel = clientFilters.find(f => f.value === period)?.label;

  // Handle preset click - reset custom range
  const handlePeriodClick = (newPeriod: FilterPeriod) => {
    if (isCustomRangeActive) {
      onDateRangeChange(undefined); // Reset custom range
    }
    onPeriodChange(newPeriod);
  };

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 p-1.5 bg-muted/50 rounded-xl",
      className
    )}>
      {/* Date + Period filters - scrollable on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <DateRangeFilter
            value={dateRange}
            onChange={onDateRangeChange}
            className={isCustomRangeActive ? "ring-2 ring-primary/50" : ""}
          />
          {/* Custom range indicator */}
          {rangeSummary && (
            <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full font-medium">
              {rangeSummary}
            </span>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-0.5 p-0.5 bg-muted rounded-lg flex-shrink-0",
          isCustomRangeActive && "opacity-50"
        )}>
          {periodFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handlePeriodClick(filter.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap",
                !isCustomRangeActive && period === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
          
          {/* Client count dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap flex items-center gap-1",
                  !isCustomRangeActive && isClientPeriodActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isClientPeriodActive ? selectedClientLabel : 'Клиенты'}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover min-w-[80px]">
              {clientFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.value}
                  onClick={() => handlePeriodClick(filter.value)}
                  className="flex items-center justify-between text-xs"
                >
                  {filter.label}
                  {period === filter.value && <Check className="h-3 w-3 ml-2" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
