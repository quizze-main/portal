import { useMemo } from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManagerRankingCard, type ManagerRankingRow, type DisplayMode } from './ManagerRankingCard';
import { RankingColumnsEditor } from './RankingColumnsEditor';
import { LOSS_COLUMN_CODE, type RankingColumnDef } from '@/hooks/useLeaderMetrics';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: string;
  direction: SortDirection;
}

interface ManagerRankingMobileProps {
  rows: ManagerRankingRow[];
  displayMode: DisplayMode;
  isInverted: boolean;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onInvertedChange: (value: boolean) => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: string) => void;
  showBranch?: boolean;
  loadedMetrics?: Set<string>;
  columnDefs: RankingColumnDef[];
  visibleColumns?: string[];
  isEditMode?: boolean;
  onColumnsChange?: (codes: string[]) => void;
  availableMetrics?: Array<{ id: string; name: string; trackerCode?: string }>;
  title?: string;
}

export function ManagerRankingMobile({
  rows,
  displayMode,
  isInverted,
  onDisplayModeChange,
  onInvertedChange,
  onManagerClick,
  sortConfig,
  onSort,
  showBranch,
  loadedMetrics,
  columnDefs,
  visibleColumns,
  isEditMode,
  onColumnsChange,
  availableMetrics,
  title,
}: ManagerRankingMobileProps) {
  // Build sort options from column defs
  const sortOptions = useMemo(() => {
    const opts: { field: string; label: string }[] = [
      { field: 'planPercent', label: '% плана' },
    ];
    columnDefs.forEach(col => {
      opts.push({ field: col.code, label: col.label });
    });
    if (columnDefs.some(c => c.code === 'revenue_created' || c.code === LOSS_COLUMN_CODE)) {
      opts.push({ field: 'lostRevenue', label: 'Потери' });
    }
    return opts;
  }, [columnDefs]);

  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || 'Сортировка';

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-muted/60">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">{title || 'Рейтинг менеджеров'}</h3>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px] sm:text-xs gap-1.5 flex-1 justify-between bg-background rounded-full border border-border/60"
              >
                <span className="truncate">{currentSortLabel}</span>
                <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 bg-popover z-50 text-[11px] sm:text-xs">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => onSort(option.field)}
                  className={`max-w-[9rem] truncate ${sortConfig.field === option.field ? 'bg-muted' : ''}`}
                  title={option.label}
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
          <div className="flex items-center gap-1 rounded-full bg-muted p-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (displayMode !== 'fact') onDisplayModeChange('fact');
              }}
              className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
                displayMode === 'fact'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Прогноз
            </button>
            <button
              type="button"
              onClick={() => {
                if (displayMode !== 'plan') onDisplayModeChange('plan');
              }}
              className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
                displayMode === 'plan'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              План
            </button>
            <button
              type="button"
              onClick={() => onInvertedChange(!isInverted)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Переключить порядок"
              title="Переключить порядок"
            >
              <ArrowUpDown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isEditMode && onColumnsChange && visibleColumns && (
        <RankingColumnsEditor
          type="manager"
          visibleColumns={visibleColumns}
          onChange={onColumnsChange}
          availableMetrics={availableMetrics}
        />
      )}

      {/* Cards List */}
      <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
        {rows.map((row) => (
          <ManagerRankingCard
            key={row.id}
            manager={row}
            displayMode={displayMode}
            isInverted={isInverted}
            highlightedField={sortConfig.field}
            onClick={onManagerClick ? () => onManagerClick(row.id) : undefined}
            showBranch={showBranch}
            loadedMetrics={loadedMetrics}
            columnDefs={columnDefs}
          />
        ))}
      </div>
    </div>
  );
}
