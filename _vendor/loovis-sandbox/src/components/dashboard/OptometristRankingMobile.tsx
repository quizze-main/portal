import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OptometristRankingCard, OptometristRankingRow, OptometristSortField } from './OptometristRankingCard';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: OptometristSortField;
  direction: SortDirection;
}

interface OptometristRankingMobileProps {
  rows: OptometristRankingRow[];
  showPercentFirst: boolean;
  onToggleView: () => void;
  onOptometristClick?: (optometristId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: OptometristSortField) => void;
}

const sortOptions: { field: OptometristSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'name', label: 'Имя' },
  { field: 'lensRevenue', label: 'Выручка линзы' },
  { field: 'avgLensCheck', label: 'Ср. чек линзы' },
  { field: 'designShare', label: 'Доля с дизайном' },
  { field: 'diagToSale', label: 'Диагн.→Продажа' },
  { field: 'repairToDiag', label: 'Ремонт→Диагн.' },
  { field: 'lostRevenue', label: 'Потери/Запас' },
];

export function OptometristRankingMobile({
  rows,
  showPercentFirst,
  onToggleView,
  onOptometristClick,
  sortConfig,
  onSort,
}: OptometristRankingMobileProps) {
  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || 'Сортировка';
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/60">
        <h3 className="font-semibold text-foreground mb-2">Рейтинг оптометристов</h3>
        
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
      <div className="p-3 space-y-3">
        {rows.map((row) => (
          <OptometristRankingCard
            key={row.id}
            optometrist={row}
            showPercentFirst={showPercentFirst}
            highlightedField={sortConfig.field}
            onClick={() => onOptometristClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
