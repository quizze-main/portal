import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Check } from 'lucide-react';
import { MissionRankingCard, type MissionManagerRow } from './MissionRankingCard';

export type MissionSortField = 'overall' | 'diagnostics' | 'lca' | 'children' | 'conversion';

interface MissionRankingMobileProps {
  rows: MissionManagerRow[];
  sortField: MissionSortField;
  onSort: (field: MissionSortField) => void;
  onManagerClick?: (managerId: string) => void;
}

const sortOptions: { field: MissionSortField; label: string }[] = [
  { field: 'overall', label: 'По общему выполнению' },
  { field: 'diagnostics', label: 'По диагностикам' },
  { field: 'lca', label: 'По установкам ЛКА' },
  { field: 'children', label: 'По детским проверкам' },
  { field: 'conversion', label: 'По конверсии' },
];

export function MissionRankingMobile({ 
  rows, 
  sortField, 
  onSort, 
  onManagerClick 
}: MissionRankingMobileProps) {
  return (
    <div className="space-y-3">
      {/* Sort dropdown */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Рейтинг менеджеров ({rows.length})
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="text-xs">Сортировка</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map(option => (
              <DropdownMenuItem
                key={option.field}
                onClick={() => onSort(option.field)}
                className="flex items-center justify-between"
              >
                {option.label}
                {sortField === option.field && (
                  <Check className="h-4 w-4 ml-2 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Cards */}
      <div className="space-y-2">
        {rows.map(row => (
          <MissionRankingCard
            key={row.id}
            row={row}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
