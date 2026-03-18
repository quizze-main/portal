import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type AddWidgetType = 'kpi_forecast' | 'kpi_deviation' | 'ranking' | 'chart';

interface AddWidgetTypeInfo {
  type: AddWidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  bgClass: string;
  iconBgClass: string;
}

const RANKING_ICON = (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <rect x="4" y="4" width="32" height="7" rx="1.5" fill="#3B82F6" opacity="0.25" />
    <rect x="5" y="5.5" width="6" height="4" rx="0.5" fill="#3B82F6" />
    <rect x="13" y="5.5" width="10" height="4" rx="0.5" fill="#3B82F6" opacity="0.5" />
    <rect x="25" y="5.5" width="10" height="4" rx="0.5" fill="#3B82F6" opacity="0.5" />
    <rect x="4" y="13" width="32" height="6" rx="1" fill="currentColor" opacity="0.06" />
    <rect x="5" y="14.5" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
    <rect x="13" y="14.5" width="10" height="3" rx="0.5" fill="#3B82F6" opacity="0.4" />
    <rect x="25" y="14.5" width="8" height="3" rx="0.5" fill="#10B981" opacity="0.5" />
    <rect x="4" y="21" width="32" height="6" rx="1" fill="currentColor" opacity="0.04" />
    <rect x="5" y="22.5" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
    <rect x="13" y="22.5" width="7" height="3" rx="0.5" fill="#3B82F6" opacity="0.3" />
    <rect x="25" y="22.5" width="6" height="3" rx="0.5" fill="#F59E0B" opacity="0.5" />
    <rect x="4" y="29" width="32" height="6" rx="1" fill="currentColor" opacity="0.06" />
    <rect x="5" y="30.5" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
    <rect x="13" y="30.5" width="5" height="3" rx="0.5" fill="#3B82F6" opacity="0.2" />
    <rect x="25" y="30.5" width="4" height="3" rx="0.5" fill="#EF4444" opacity="0.4" />
  </svg>
);

const FORECAST_ICON = (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" />
    <circle cx="20" cy="20" r="15" fill="none" stroke="#3B82F6" strokeWidth="3"
      strokeDasharray="70 94" strokeDashoffset="-23" strokeLinecap="round" />
    <circle cx="20" cy="20" r="15" fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.35"
      strokeDasharray="18 94" strokeDashoffset="-93" strokeLinecap="round" />
    <text x="20" y="23" textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor">75%</text>
  </svg>
);

const DEVIATION_ICON = (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <path d="M 6 28 A 16 16 0 0 1 34 28" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" strokeLinecap="round" />
    <path d="M 6 28 A 16 16 0 0 1 13 14" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    <path d="M 13 14 A 16 16 0 0 1 27 14" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <path d="M 27 14 A 16 16 0 0 1 34 28" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
    <line x1="20" y1="27" x2="26" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="20" cy="27" r="2" fill="currentColor" />
    <text x="20" y="37" textAnchor="middle" fontSize="8" fontWeight="600" fill="currentColor">+5%</text>
  </svg>
);

const CHART_ICON = (
  <svg viewBox="0 0 40 40" className="w-8 h-8">
    <rect x="5" y="26" width="5" height="10" rx="1" fill="#3B82F6" opacity="0.4" />
    <rect x="12" y="20" width="5" height="16" rx="1" fill="#3B82F6" opacity="0.6" />
    <rect x="19" y="14" width="5" height="22" rx="1" fill="#3B82F6" opacity="0.8" />
    <rect x="26" y="18" width="5" height="18" rx="1" fill="#3B82F6" opacity="0.5" />
    <rect x="33" y="10" width="5" height="26" rx="1" fill="#10B981" opacity="0.7" />
    <path d="M 7 24 L 14 18 L 21 12 L 28 16 L 35 8" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="24" r="1.5" fill="#F59E0B" />
    <circle cx="14" cy="18" r="1.5" fill="#F59E0B" />
    <circle cx="21" cy="12" r="1.5" fill="#F59E0B" />
    <circle cx="28" cy="16" r="1.5" fill="#F59E0B" />
    <circle cx="35" cy="8" r="1.5" fill="#F59E0B" />
  </svg>
);

const ADD_WIDGET_TYPES: AddWidgetTypeInfo[] = [
  {
    type: 'kpi_forecast',
    label: 'Прогноз',
    description: 'Кольцевая диаграмма, показывающая процент выполнения плана. Отображает факт, план и прогноз на конец периода. Подходит для абсолютных метрик: выручка, количество продаж, средний чек.',
    icon: FORECAST_ICON,
    bgClass: 'bg-white dark:bg-card border-border hover:border-primary/40',
    iconBgClass: 'bg-muted/60 dark:bg-muted/30',
  },
  {
    type: 'kpi_deviation',
    label: 'Отклонение',
    description: 'Спидометр с отклонением от плана в процентах. Цветные зоны: красная (ниже нормы), жёлтая (около плана), зелёная (выше плана). Подходит для средних и процентных метрик: конверсия, CSI, маржинальность.',
    icon: DEVIATION_ICON,
    bgClass: 'bg-white dark:bg-card border-border hover:border-primary/40',
    iconBgClass: 'bg-muted/60 dark:bg-muted/30',
  },
  {
    type: 'ranking',
    label: 'Рейтинг',
    description: 'Сводная таблица с ранжированием филиалов или сотрудников по выбранным метрикам. Показывает позицию, значения метрик и потери/запас относительно лидера. Настраивается набор колонок и формула потерь.',
    icon: RANKING_ICON,
    bgClass: 'bg-white dark:bg-card border-border hover:border-primary/40',
    iconBgClass: 'bg-muted/60 dark:bg-muted/30',
  },
  {
    type: 'chart',
    label: 'График',
    description: 'Дневной график факт/план по выбранной метрике. Столбчатый (абсолютные значения) или линейный (проценты). Данные агрегируются по филиалу или менеджеру.',
    icon: CHART_ICON,
    bgClass: 'bg-white dark:bg-card border-border hover:border-primary/40',
    iconBgClass: 'bg-muted/60 dark:bg-muted/30',
  },
];

interface WidgetTypeCardsProps {
  onSelect: (type: AddWidgetType) => void;
}

export default function WidgetTypeCards({ onSelect }: WidgetTypeCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ADD_WIDGET_TYPES.map(wt => (
        <button
          key={wt.type}
          type="button"
          onClick={() => onSelect(wt.type)}
          className={cn(
            'relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer',
            wt.bgClass,
          )}
        >
          <div className={cn('shrink-0 rounded-lg p-1', wt.iconBgClass)}>
            {wt.icon}
          </div>
          <span className="text-xs font-semibold">{wt.label}</span>
          <Tooltip>
            <TooltipTrigger asChild onClick={e => e.stopPropagation()}>
              <span className="absolute top-1.5 right-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-64 text-xs leading-relaxed">
              {wt.description}
            </TooltipContent>
          </Tooltip>
        </button>
      ))}
    </div>
  );
}
