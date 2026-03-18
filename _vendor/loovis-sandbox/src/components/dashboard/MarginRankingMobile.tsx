import React from 'react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Activity, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarginManagerRow, MarginMetricValue } from '@/data/marginData';

export type MarginSortField = 'name' | 'planPercent' | 'margin' | 'revenue' | 'marginPercent' | 'lostMargin';

interface SortConfig {
  field: MarginSortField;
  direction: 'asc' | 'desc';
}

interface MarginRankingMobileProps {
  rows: MarginManagerRow[];
  showPercentFirst: boolean;
  onToggleView: () => void;
  onManagerClick?: (managerId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: MarginSortField) => void;
}

const sortOptions: { field: MarginSortField; label: string }[] = [
  { field: 'planPercent', label: '% плана' },
  { field: 'margin', label: 'Маржа' },
  { field: 'revenue', label: 'Выручка' },
  { field: 'marginPercent', label: 'Маржинальность' },
  { field: 'lostMargin', label: 'Потери/Запас' },
];

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

const getPercentColor = (percent: number) => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressColor = (percent: number) => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatCurrency = (value: number) => value.toLocaleString('ru-RU') + ' ₽';

interface CompactMetricProps {
  label: string;
  value: string | number;
  percent?: number;
  isHighlighted?: boolean;
  showPercentFirst?: boolean;
}

const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, percent, isHighlighted, showPercentFirst }) => (
  <div className={cn(
    "flex flex-col items-center text-center py-1.5 px-1 rounded-md",
    isHighlighted && "bg-primary/5 ring-1 ring-primary/20"
  )}>
    <span className="text-[10px] text-muted-foreground mb-0.5">{label}</span>
    {showPercentFirst && percent !== undefined ? (
      <>
        <span className={cn("text-xs font-bold flex items-center gap-0.5", getPercentColor(percent))}>
          <Activity className="w-3 h-3" />
          {percent}%
        </span>
        <span className="text-[10px] text-muted-foreground">{value}</span>
      </>
    ) : (
      <>
        <span className="text-xs font-semibold">{value}</span>
        {percent !== undefined && (
          <span className={cn("text-[10px] flex items-center gap-0.5", getPercentColor(percent))}>
            <Activity className="w-2.5 h-2.5" />
            {percent}%
          </span>
        )}
      </>
    )}
  </div>
);

interface ManagerCardProps {
  row: MarginManagerRow;
  sortField: MarginSortField;
  showPercentFirst: boolean;
  onClick?: () => void;
}

const ManagerCard: React.FC<ManagerCardProps> = ({ row, sortField, showPercentFirst, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border shadow-sm p-3 text-left hover:bg-muted/30 transition-colors"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-bold text-muted-foreground w-5">{row.rank}</span>
        <Avatar className="w-9 h-9">
          <AvatarImage src={getManagerAvatar(row.id)} />
          <AvatarFallback className="text-xs bg-primary/10">{getInitials(row.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{row.name}</p>
          <p className="text-xs text-muted-foreground truncate">{row.role}</p>
        </div>
        <div className="text-right">
          <span className={cn("text-lg font-bold", getPercentColor(row.planPercent))}>
            {row.planPercent}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", getProgressColor(row.planPercent))}
            style={{ width: `${Math.min(row.planPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-1">
        <CompactMetric
          label="Маржа"
          value={formatCurrency(row.margin.value)}
          percent={row.margin.forecast}
          isHighlighted={sortField === 'margin'}
          showPercentFirst={showPercentFirst}
        />
        <CompactMetric
          label="Выручка"
          value={formatCurrency(row.revenue.value)}
          percent={row.revenue.forecast}
          isHighlighted={sortField === 'revenue'}
          showPercentFirst={showPercentFirst}
        />
        <CompactMetric
          label="Марж-ть"
          value={`${row.marginPercent}%`}
          isHighlighted={sortField === 'marginPercent'}
        />
        <div className={cn(
          "flex flex-col items-center text-center py-1.5 px-1 rounded-md",
          sortField === 'lostMargin' && "ring-1 ring-primary/20",
          row.lostMargin >= 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"
        )}>
          <span className="text-[10px] text-muted-foreground mb-0.5">
            {row.lostMargin >= 0 ? 'Потери' : 'Запас'}
          </span>
          <span className={cn(
            "text-xs font-semibold",
            row.lostMargin >= 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {row.lostMargin >= 0 ? `−${formatCurrency(row.lostMargin)}` : `+${formatCurrency(Math.abs(row.lostMargin))}`}
          </span>
        </div>
      </div>
    </button>
  );
};

export const MarginRankingMobile: React.FC<MarginRankingMobileProps> = ({
  rows,
  showPercentFirst,
  onToggleView,
  onManagerClick,
  sortConfig,
  onSort
}) => {
  const currentSortLabel = sortOptions.find(o => o.field === sortConfig.field)?.label || 'Сортировка';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-foreground">По менеджерам — Маржа</h3>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                {currentSortLabel}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map(option => (
                <DropdownMenuItem 
                  key={option.field}
                  onClick={() => onSort(option.field)}
                  className={cn(sortConfig.field === option.field && "bg-accent")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleView}
            className="h-7 px-2 text-xs gap-1"
          >
            <ArrowUpDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {rows.map(row => (
          <ManagerCard
            key={row.id}
            row={row}
            sortField={sortConfig.field}
            showPercentFirst={showPercentFirst}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
};
