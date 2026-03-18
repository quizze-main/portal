import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RevenueSzRankingCard, RevenueSzRankingRow, RevenueSzSortField } from './RevenueSzRankingCard';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: RevenueSzSortField;
  direction: SortDirection;
}

interface RevenueSzRankingMobileProps {
  rows: RevenueSzRankingRow[];
  showPercentFirst: boolean;
  onToggleView: () => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: RevenueSzSortField) => void;
}

const sortOptions: { field: RevenueSzSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'name', label: 'Имя' },
  { field: 'revenueSz', label: 'Выручка СЗ' },
  { field: 'ordersCount', label: 'Заказов СЗ' },
  { field: 'clientsCount', label: 'Кол-во ФЛ' },
  { field: 'avgCost', label: 'Ср. стоимость' },
  { field: 'conversion', label: 'Конверсия' },
  { field: 'lostRevenue', label: 'Потери' },
];

export function RevenueSzRankingMobile({
  rows,
  showPercentFirst,
  onToggleView,
  onManagerClick,
  sortConfig,
  onSort,
}: RevenueSzRankingMobileProps) {
  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || 'Сортировка';
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/60">
        <h3 className="font-semibold text-foreground mb-2">Рейтинг менеджеров</h3>
        
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs gap-1.5 flex-1 justify-between bg-background"
              >
                <span className="truncate">{currentSortLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
              {sortOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.field}
                  onClick={() => onSort(option.field)}
                  className={sortConfig.field === option.field ? 'bg-muted' : ''}
                >
                  {option.label}
                  {sortConfig.field === option.field && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {sortConfig.direction === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Toggle view */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleView}
            className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {showPercentFirst ? '%' : '₽'}
          </Button>
        </div>
      </div>
      
      {/* Cards List */}
      <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
        {rows.map((row) => (
          <RevenueSzRankingCard
            key={row.id}
            manager={row}
            showPercentFirst={showPercentFirst}
            highlightedField={sortConfig.field}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
