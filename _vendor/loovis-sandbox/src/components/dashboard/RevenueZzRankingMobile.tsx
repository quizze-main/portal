import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RevenueZzRankingCard, RevenueZzRankingRow, RevenueZzSortField } from './RevenueZzRankingCard';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: RevenueZzSortField;
  direction: SortDirection;
}

interface RevenueZzRankingMobileProps {
  rows: RevenueZzRankingRow[];
  showPercentFirst: boolean;
  onToggleView: () => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: RevenueZzSortField) => void;
}

const sortOptions: { field: RevenueZzSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'revenueZz', label: 'Выручка ЗЗ' },
  { field: 'closingsCount', label: 'Закрытий' },
  { field: 'avgClosingDays', label: 'Ср. время' },
  { field: 'onTimePercent', label: '% в срок' },
  { field: 'lostRevenue', label: 'Потери' },
];

export function RevenueZzRankingMobile({
  rows,
  showPercentFirst,
  onToggleView,
  onManagerClick,
  sortConfig,
  onSort,
}: RevenueZzRankingMobileProps) {
  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || '% плана';

  return (
    <div className="space-y-3">
      {/* Header with controls */}
      <div className="bg-card rounded-xl border shadow-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Рейтинг менеджеров</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1 flex-1">
                <span className="text-muted-foreground">Сортировка:</span>
                <span className="font-medium">{currentSortLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              {sortOptions.map(option => (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => onSort(option.field)}
                  className={sortConfig.field === option.field ? 'bg-primary/10' : ''}
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

          {/* View toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleView}
            className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {showPercentFirst ? '%' : '₽'}
          </Button>
        </div>
      </div>

      {/* Manager cards */}
      <div className="space-y-2">
        {rows.map(row => (
          <RevenueZzRankingCard
            key={row.id}
            manager={row}
            showPercentFirst={showPercentFirst}
            highlightedField={sortConfig.field !== 'name' && sortConfig.field !== 'planPercent' ? sortConfig.field : undefined}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
