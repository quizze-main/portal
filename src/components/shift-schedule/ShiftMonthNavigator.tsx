import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShiftMonthNavigatorProps {
  month: string; // "YYYY-MM"
  onChange: (month: string) => void;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function ShiftMonthNavigator({ month, onChange }: ShiftMonthNavigatorProps) {
  const [year, m] = month.split('-').map(Number);
  const monthName = MONTH_NAMES[m - 1];

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && m === now.getMonth() + 1;

  const navigate = (delta: number) => {
    const d = new Date(year, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onChange(newMonth);
  };

  const goToToday = () => {
    onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="inline-flex items-center gap-1 bg-muted/60 dark:bg-muted/30 rounded-xl p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg hover:bg-background/80"
        onClick={() => navigate(-1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <button
        onClick={goToToday}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold
          transition-all duration-200
          ${isCurrentMonth
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'hover:bg-background/80 text-foreground'
          }
        `}
      >
        <Calendar className="w-3.5 h-3.5" />
        {monthName} {year}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg hover:bg-background/80"
        onClick={() => navigate(1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
