import { cn, getManagerAvatar } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronDown, ArrowUpDown, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExtendedConversionRow } from './ConversionRankingTable';

export type ConversionSortField = 'overall' | 'flSale' | 'repairCheck' | 'repairSale' | 'flCheck' | 'checkSale' | 'lostRevenue';

interface ConversionRankingMobileProps {
  rows: ExtendedConversionRow[];
  sortField: ConversionSortField;
  onSort: (field: ConversionSortField) => void;
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

const sortOptions: { field: ConversionSortField; label: string }[] = [
  { field: 'overall', label: '% плана' },
  { field: 'flSale', label: 'ФЛ → Продажа' },
  { field: 'repairCheck', label: 'Ремонт → Проверка' },
  { field: 'repairSale', label: 'Ремонт → Продажа' },
  { field: 'flCheck', label: 'ФЛ → Проверка' },
  { field: 'checkSale', label: 'Проверка → Продажа' },
  { field: 'lostRevenue', label: 'Потери' },
];

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressColor = (percent: number): string => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatCurrency = (value: number): string => {
  return Math.abs(value).toLocaleString('ru-RU');
};

interface CompactMetricProps {
  label: string;
  value: number;
  percent: number;
  isHighlighted?: boolean;
}

const CompactMetric = ({ label, value, percent, isHighlighted }: CompactMetricProps) => (
  <div className={cn(
    "text-center p-1.5 rounded",
    isHighlighted && "bg-primary/10"
  )}>
    <div className="text-[10px] text-muted-foreground truncate">{label}</div>
    <div className={cn("text-sm font-bold", getPercentColor(percent))}>
      {value}%
    </div>
    <div className="flex items-center justify-center gap-0.5">
      <Activity className="w-2.5 h-2.5 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">{percent}%</span>
    </div>
  </div>
);

interface ManagerCardProps {
  row: ExtendedConversionRow;
  sortField: ConversionSortField;
  onClick?: () => void;
}

function ManagerCard({ row, sortField, onClick }: ManagerCardProps) {
  return (
    <Card 
      className="p-3 border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-muted-foreground w-5">{row.rank}</span>
        <Avatar className="w-8 h-8">
          <AvatarImage src={getManagerAvatar(row.id)} alt={row.name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(row.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
          <p className="text-xs text-muted-foreground truncate">{row.role}</p>
        </div>
        <div className="text-right">
          <span className={cn("text-lg font-bold", getPercentColor(row.overallPercent))}>
            {row.overallPercent}%
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {/* Progress */}
      <Progress 
        value={Math.min(row.overallPercent, 100)} 
        className="h-1.5 mb-3"
      />
      
      {/* Metrics grid - 2 rows of 3 */}
      <div className="grid grid-cols-3 gap-1">
        <CompactMetric 
          label="ФЛ→Прод" 
          value={row.flSale.current} 
          percent={row.flSalePercent}
          isHighlighted={sortField === 'flSale'}
        />
        <CompactMetric 
          label="Рем→Пров" 
          value={row.repairCheck.current} 
          percent={row.repairCheckPercent}
          isHighlighted={sortField === 'repairCheck'}
        />
        <CompactMetric 
          label="Рем→Прод" 
          value={row.repairSale.current} 
          percent={row.repairSalePercent}
          isHighlighted={sortField === 'repairSale'}
        />
        <CompactMetric 
          label="ФЛ→Пров" 
          value={row.flCheck.current} 
          percent={row.flCheckPercent}
          isHighlighted={sortField === 'flCheck'}
        />
        <CompactMetric 
          label="Пров→Прод" 
          value={row.checkSale.current} 
          percent={row.checkSalePercent}
          isHighlighted={sortField === 'checkSale'}
        />
        <div className={cn(
          "text-center p-1.5 rounded",
          sortField === 'lostRevenue' && "bg-primary/10"
        )}>
          <div className="text-[10px] text-muted-foreground">Потери</div>
          {row.lostRevenue > 0 ? (
            <div className="text-sm font-bold text-destructive">
              −{formatCurrency(row.lostRevenue)} ₽
            </div>
          ) : row.lostRevenue < 0 ? (
            <div className="text-sm font-bold text-emerald-600">
              +{formatCurrency(row.lostRevenue)} ₽
            </div>
          ) : (
            <div className="text-sm font-bold text-muted-foreground">0 ₽</div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ConversionRankingMobile({ 
  rows, 
  sortField, 
  onSort, 
  onManagerClick,
  className 
}: ConversionRankingMobileProps) {
  const currentSortLabel = sortOptions.find(opt => opt.field === sortField)?.label || '% плана';
  
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with sort */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Рейтинг по конверсиям</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-xs">{currentSortLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.field}
                onClick={() => onSort(option.field)}
                className={cn(
                  "text-sm",
                  sortField === option.field && "bg-accent font-medium"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Cards */}
      <div className="space-y-2">
        {rows.map((row) => (
          <ManagerCard
            key={row.id}
            row={row}
            sortField={sortField}
            onClick={() => onManagerClick?.(row.id)}
          />
        ))}
      </div>
    </div>
  );
}
