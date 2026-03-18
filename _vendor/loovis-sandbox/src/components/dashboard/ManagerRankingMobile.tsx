import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManagerRankingCard, ManagerRankingRow, ManagerSortField, DisplayMode } from './ManagerRankingCard';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: ManagerSortField;
  direction: SortDirection;
}

interface ManagerRankingMobileProps {
  rows: ManagerRankingRow[];
  displayMode: DisplayMode;
  isInverted: boolean;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onInvertedChange: (inverted: boolean) => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: ManagerSortField) => void;
}

const sortOptions: { field: ManagerSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'name', label: 'Имя' },
  { field: 'revenueSz', label: 'Выручка СЗ' },
  { field: 'revenueZz', label: 'Выручка ЗЗ' },
  { field: 'clientsCount', label: 'Кол-во ФЛ' },
  { field: 'avgGlasses', label: 'Ср. стоимость' },
  { field: 'conversion', label: 'Конверсия' },
  { field: 'csi', label: 'CSI' },
  { field: 'margin', label: 'Маржа' },
  { field: 'lostRevenue', label: 'Потери' },
];

export function ManagerRankingMobile({
  rows,
  displayMode,
  isInverted,
  onDisplayModeChange,
  onInvertedChange,
  onManagerClick,
  sortConfig,
  onSort,
}: ManagerRankingMobileProps) {
  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || 'Сортировка';
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden -mx-2 sm:mx-0">
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
          
          {/* Display mode toggle: Прогноз | ⇅ | План */}
          <div className="flex items-center gap-0.5 bg-background border rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => onDisplayModeChange('fact')}
              className={cn(
                "px-2 h-7 text-xs rounded-md transition-colors",
                displayMode === 'fact' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              Прогноз
            </button>
            
            <button
              onClick={() => onInvertedChange(!isInverted)}
              className={cn(
                "px-1.5 h-7 rounded-md transition-colors hover:bg-muted",
                isInverted && "bg-muted"
              )}
              title="Поменять местами значения"
            >
              <ArrowUpDown className={cn(
                "w-3.5 h-3.5 transition-transform",
                isInverted && "rotate-180"
              )} />
            </button>
            
            <button
              onClick={() => onDisplayModeChange('plan')}
              className={cn(
                "px-2 h-7 text-xs rounded-md transition-colors",
                displayMode === 'plan' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              План
            </button>
          </div>
        </div>
      </div>
      
      {/* Cards List */}
      <div className="p-4 space-y-3">
        {rows.map((row) => (
          <ManagerRankingCard
            key={row.id}
            manager={row}
            displayMode={displayMode}
            isInverted={isInverted}
            highlightedField={sortConfig.field}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
