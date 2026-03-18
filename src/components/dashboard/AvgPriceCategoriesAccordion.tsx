import React, { useState } from 'react';
import { ChevronRight, Glasses, Frame, Wrench, Eye, Sparkles, CircleDollarSign, Trophy, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avgPriceManagersData } from '@/data/mockData';
import { avgPriceManagersDataByPeriod, avgPriceCategoriesByPeriod } from '@/data/periodData';
import { useNavigate } from 'react-router-dom';
import { FilterPeriod } from './FilterBar';

interface CategoryManager {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  forecast: number;
}

interface AvgPriceCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  current: number;
  plan: number;
  unit: string;
  managerField: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  'glasses_complete': Glasses,
  'frame': Frame,
  'manufacturing': Wrench,
  'lens': Eye,
  'design_share': Sparkles,
  'design_lens': CircleDollarSign,
};

const categoryManagerFields: Record<string, string> = {
  'glasses_complete': 'glassesComplete',
  'frame': 'frame',
  'manufacturing': 'manufacturing',
  'lens': 'lens',
  'design_share': 'designShare',
  'design_lens': 'designLens',
};

const getPercentColor = (percent: number) => {
  if (percent >= 100) return 'text-emerald-500';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getBgColor = (percent: number) => {
  if (percent >= 100) return 'bg-emerald-500/10';
  if (percent >= 80) return 'bg-amber-500/10';
  return 'bg-red-500/10';
};

const getProgressBarColor = (percent: number) => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatValue = (value: number, unit: string) => {
  if (unit === '%') return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}K ${unit}`;
  return `${value.toLocaleString('ru-RU')} ${unit}`;
};

const formatValueFull = (value: number, unit: string) => {
  if (unit === '%') return `${value}%`;
  return `${value.toLocaleString('ru-RU')} ${unit}`;
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0];
  }
  return name.substring(0, 2).toUpperCase();
};

interface ManagerRowProps {
  manager: CategoryManager;
  unit: string;
  plan: number;
  onClick: () => void;
}

const ManagerRow: React.FC<ManagerRowProps> = ({ manager, unit, plan, onClick }) => {
  const percent = manager.forecast;
  // Calculate bar width based on value relative to plan (max 120% to show overflow)
  const barPercent = Math.min((manager.value / plan) * 100, 120);
  const overflowPercent = manager.value > plan ? ((manager.value - plan) / plan) * 100 : 0;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };
  
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
    >
      {/* Initials */}
      <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 rounded px-1 py-0.5 shrink-0 w-6 text-center">
        {getInitials(manager.name)}
      </span>
      
      {/* Name - hidden on mobile */}
      <span className="hidden sm:block text-xs font-medium w-28 truncate shrink-0">
        {manager.name}
      </span>
      
      {/* Horizontal bar chart - thin and native */}
      <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden relative min-w-[60px]">
        {/* Main progress bar */}
        <div 
          style={{ width: `${Math.min(barPercent, 100)}%` }}
          className={cn(
            "h-full rounded-full transition-all",
            getProgressBarColor(percent)
          )}
        />
        {/* Overflow indicator for >100% */}
        {overflowPercent > 0 && (
          <div 
            style={{ width: `${Math.min(overflowPercent, 20)}%`, left: `${Math.min(barPercent - overflowPercent, 100)}%` }}
            className="absolute top-0 h-full bg-emerald-400/70 rounded-full"
          />
        )}
      </div>
      
      {/* Value - full format */}
      <span className="text-xs font-semibold tabular-nums w-20 text-right shrink-0">
        {formatValueFull(manager.value, unit)}
      </span>
      
      {/* Percentage badge */}
      <span className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[36px] text-center tabular-nums shrink-0",
        getBgColor(percent),
        getPercentColor(percent)
      )}>
        {percent}%
      </span>
    </button>
  );
};

interface ManagerSummaryProps {
  best: CategoryManager;
  worst: CategoryManager;
}

const ManagerSummary: React.FC<ManagerSummaryProps> = ({ best, worst }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2 px-2 py-1.5 bg-muted/30 rounded-lg text-xs">
    <div className="flex items-center gap-1.5">
      <Trophy className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="text-muted-foreground">Лучший:</span>
      <span className="font-semibold truncate">{best.name.split(' ')[0]}</span>
      <span className={cn("font-bold", getPercentColor(best.forecast))}>({best.forecast}%)</span>
    </div>
    <div className="flex items-center gap-1.5">
      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
      <span className="text-muted-foreground">Внимание:</span>
      <span className="font-semibold truncate">{worst.name.split(' ')[0]}</span>
      <span className={cn("font-bold", getPercentColor(worst.forecast))}>({worst.forecast}%)</span>
    </div>
  </div>
);

interface CategoryItemProps {
  category: AvgPriceCategory;
  managers: CategoryManager[];
  onManagerClick: (managerId: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, managers, onManagerClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = category.icon;
  const percent = Math.round((category.current / category.plan) * 100);
  
  // Sort managers by forecast (best to worst)
  const sortedManagers = [...managers].sort((a, b) => b.forecast - a.forecast);
  const bestManager = sortedManagers[0];
  const worstManager = sortedManagers[sortedManagers.length - 1];
  
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-3 hover:bg-muted/30 transition-colors"
      >
        {/* Mobile: vertical layout */}
        <div className="sm:hidden space-y-2">
          {/* Row 1: chevron + icon + full category name */}
          <div className="flex items-center gap-2">
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-90"
            )} />
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
              getBgColor(percent)
            )}>
              <Icon className={cn("w-3.5 h-3.5", getPercentColor(percent))} />
            </div>
            <span className="text-sm font-medium text-left">{category.name}</span>
          </div>
          
          {/* Row 2: progress bar + value + percent */}
          <div className="flex items-center gap-2 pl-6">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(percent, 100)}%` }} 
                className={cn("h-full rounded-full transition-all", getProgressBarColor(percent))} 
              />
            </div>
            <span className="text-sm font-bold tabular-nums shrink-0">
              {formatValueFull(category.current, category.unit)}
            </span>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded text-center tabular-nums shrink-0",
              getBgColor(percent),
              getPercentColor(percent)
            )}>
              {percent}%
            </span>
          </div>
        </div>

        {/* Desktop: horizontal grid */}
        <div className="hidden sm:grid grid-cols-[1fr_auto] items-center gap-3">
          {/* Left: icon + name */}
          <div className="flex items-center gap-2 min-w-0">
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-90"
            )} />
            <div className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
              getBgColor(percent)
            )}>
              <Icon className={cn("w-4 h-4", getPercentColor(percent))} />
            </div>
            <span className="text-sm font-medium truncate">{category.name}</span>
          </div>
          
          {/* Right: fixed grid for alignment */}
          <div className="grid grid-cols-[80px_80px_70px_44px] items-center gap-1">
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(percent, 100)}%` }} 
                className={cn("h-full rounded-full transition-all", getProgressBarColor(percent))} 
              />
            </div>
            
            {/* Current value */}
            <span className="text-sm font-bold tabular-nums text-right">
              {formatValueFull(category.current, category.unit)}
            </span>
            
            {/* Plan value */}
            <span className="text-xs text-muted-foreground text-right">
              / {formatValueFull(category.plan, category.unit)}
            </span>
            
            {/* Percentage badge */}
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded text-center tabular-nums",
              getBgColor(percent),
              getPercentColor(percent)
            )}>
              {percent}%
            </span>
          </div>
        </div>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-0.5">
            {sortedManagers.map((manager) => (
              <ManagerRow
                key={manager.id}
                manager={manager}
                unit={category.unit}
                plan={category.plan}
                onClick={() => onManagerClick(manager.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface AvgPriceCategoriesAccordionProps {
  period?: FilterPeriod;
}

export const AvgPriceCategoriesAccordion: React.FC<AvgPriceCategoriesAccordionProps> = ({ 
  period = 'month' 
}) => {
  const navigate = useNavigate();
  
  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };
  
  // Get period-specific data
  const periodCategories = avgPriceCategoriesByPeriod[period];
  const periodManagers = avgPriceManagersDataByPeriod[period];
  
  // Build categories with icons and manager fields
  const categories: AvgPriceCategory[] = periodCategories.map(c => ({
    ...c,
    icon: categoryIcons[c.id] || Glasses,
    managerField: categoryManagerFields[c.id] || 'glassesComplete',
  }));
  
  // Map managers data to each category
  const getCategoryManagers = (managerField: string): CategoryManager[] => {
    return periodManagers.map((m) => {
      const fieldData = m[managerField as keyof typeof m] as { value: number; forecast: number };
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        value: fieldData.value,
        forecast: fieldData.forecast,
      };
    });
  };
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/50">
        <h3 className="text-sm font-semibold">Категории средней стоимости</h3>
      </div>
      <div>
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            managers={getCategoryManagers(category.managerField)}
            onManagerClick={handleManagerClick}
          />
        ))}
      </div>
    </div>
  );
};
