import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';

interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const formatDateRange = () => {
    if (!value?.from) {
      return 'Выбрать период';
    }
    if (value.to) {
      return `${format(value.from, 'd', { locale: ru })}-${format(value.to, 'd MMM', { locale: ru })}`;
    }
    return format(value.from, 'd MMM', { locale: ru });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 px-2.5 gap-1.5 text-sm font-medium bg-background shadow-sm border border-border/50 rounded-lg",
            className
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-foreground">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={(range) => {
            onChange(range);
            if (range?.to) {
              setOpen(false);
            }
          }}
          numberOfMonths={1}
          locale={ru}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
