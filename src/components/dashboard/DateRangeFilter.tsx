import { useCallback, useState } from 'react';
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

  const normalizeDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Поведение выбора диапазона строго по правилу:
  // 1-й клик -> from, to сбрасываем
  // 2-й клик -> to (если клик раньше from, то меняем местами), затем закрываем поповер
  const handleDayClick = useCallback((day: Date) => {
    const clicked = normalizeDay(day);
    const from = value?.from ? normalizeDay(value.from) : undefined;
    const to = value?.to ? normalizeDay(value.to) : undefined;

    // Если диапазон не начат или уже завершён — начинаем заново с from
    if (!from || (from && to)) {
      onChange({ from: clicked, to: undefined });
      return;
    }

    // Второй клик — завершаем диапазон
    if (clicked < from) {
      onChange({ from: clicked, to: from });
    } else {
      onChange({ from, to: clicked });
    }
    setOpen(false);
  }, [onChange, value?.from, value?.to]);

  const formatDateRange = () => {
    if (!value?.from) {
      return 'Выбрать период';
    }
    if (value.to) {
      const sameMonth = value.from.getMonth() === value.to.getMonth()
        && value.from.getFullYear() === value.to.getFullYear();
      const sameYear = value.from.getFullYear() === value.to.getFullYear();

      if (sameMonth) {
        // 1-12 мар.
        return `${format(value.from, 'd', { locale: ru })}-${format(value.to, 'd MMM', { locale: ru })}`;
      }
      if (sameYear) {
        // 29 мар. – 2 апр.
        return `${format(value.from, 'd MMM', { locale: ru })} – ${format(value.to, 'd MMM', { locale: ru })}`;
      }
      // 25 дек. 2025 – 5 янв. 2026
      return `${format(value.from, 'd MMM yyyy', { locale: ru })} – ${format(value.to, 'd MMM yyyy', { locale: ru })}`;
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
          // Управляем выбором вручную через onDayClick (см. handleDayClick)
          onSelect={() => {}}
          onDayClick={(day) => handleDayClick(day)}
          numberOfMonths={1}
          locale={ru}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
