import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientsRankingCard, ClientsRankingRow, ClientsSortField } from './ClientsRankingCard';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: ClientsSortField;
  direction: SortDirection;
}

interface ClientsRankingMobileProps {
  rows: ClientsRankingRow[];
  showPercentFirst: boolean;
  onToggleView: () => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: ClientsSortField) => void;
}

const sortOptions: { field: ClientsSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'name', label: 'Имя' },
  { field: 'total', label: 'Всего ФЛ' },
  { field: 'newClients', label: 'Новые' },
  { field: 'repeatClients', label: 'Повторные' },
  { field: 'oldCheck', label: '>6 мес.' },
  { field: 'lcaInstallations', label: 'LCA уст.' },
  { field: 'lostRevenue', label: 'Потери' },
];

export function ClientsRankingMobile({
  rows,
  showPercentFirst,
  onToggleView,
  onManagerClick,
  sortConfig,
  onSort,
}: ClientsRankingMobileProps) {
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
            {showPercentFirst ? '%' : 'Знач.'}
          </Button>
        </div>
      </div>
      
      {/* Cards List */}
      <div className="p-3 space-y-3">
        {rows.map((row) => (
          <ClientsRankingCard
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
