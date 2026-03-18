import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  icon?: boolean;
}

const filterOptions: FilterOption[] = [
  { id: 'last30', label: 'Последние 30 клиентов' },
  { id: 'last3days', label: 'Последние 3 дня' },
  { id: 'month', label: 'Показатели по месяцу' },
  { id: 'extra', label: 'Доп. фильтры', icon: true },
];

interface PeriodFilterProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function PeriodFilter({ value = 'last30', onChange }: PeriodFilterProps) {
  const [selected, setSelected] = useState(value);

  const handleSelect = (id: string) => {
    setSelected(id);
    onChange?.(id);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {filterOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => handleSelect(option.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
            selected === option.id
              ? 'bg-foreground text-background shadow-sm'
              : 'bg-background border border-border text-foreground hover:bg-muted/50'
          )}
        >
          {option.icon && <SlidersHorizontal className="h-4 w-4" />}
          <span className="truncate">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
