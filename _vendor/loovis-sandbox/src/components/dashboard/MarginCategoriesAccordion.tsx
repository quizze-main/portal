import React, { useState } from 'react';
import { ChevronRight, Eye, Frame, Package, Wrench, Contact, Trophy, AlertTriangle } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { FilterPeriod } from './FilterBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { marginCategoriesByPeriod, marginManagersDataByPeriod, MarginCategory } from '@/data/marginData';

interface CategoryManager {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  forecast: number;
}

const categoryIcons: Record<string, React.ElementType> = {
  'lenses': Eye,
  'frames': Frame,
  'accessories': Package,
  'repairs': Wrench,
  'contacts': Contact,
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

const formatValue = (value: number) => {
  return value.toLocaleString('ru-RU') + ' ₽';
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
  plan: number;
  onClick: () => void;
}

const ManagerRow: React.FC<ManagerRowProps> = ({ manager, plan, onClick }) => {
  const percent = manager.forecast;
  const barPercent = Math.min((manager.value / plan) * 100, 120);
  
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
    >
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={getManagerAvatar(manager.id)} />
        <AvatarFallback className="text-[9px] bg-primary/10">
          {getInitials(manager.name)}
        </AvatarFallback>
      </Avatar>
      
      <span className="hidden sm:block text-xs font-medium w-28 truncate shrink-0">
        {manager.name}
      </span>
      
      <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden relative min-w-[60px]">
        <div 
          style={{ width: `${Math.min(barPercent, 100)}%` }}
          className={cn("h-full rounded-full transition-all", getProgressBarColor(percent))}
        />
      </div>
      
      <span className="text-xs font-semibold tabular-nums w-24 text-right shrink-0">
        {formatValue(manager.value)}
      </span>
      
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

interface CategoryItemProps {
  category: MarginCategory;
  managers: CategoryManager[];
  onManagerClick: (managerId: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, managers, onManagerClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = categoryIcons[category.id] || Package;
  const percent = Math.round((category.margin / category.marginPlan) * 100);
  
  const sortedManagers = [...managers].sort((a, b) => b.forecast - a.forecast);
  
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-3 hover:bg-muted/30 transition-colors"
      >
        {/* Mobile layout */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-90"
            )} />
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", getBgColor(percent))}>
              <Icon className={cn("w-3.5 h-3.5", getPercentColor(percent))} />
            </div>
            <span className="text-sm font-medium text-left">{category.name}</span>
          </div>
          
          <div className="flex items-center gap-2 pl-6">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(percent, 100)}%` }} 
                className={cn("h-full rounded-full transition-all", getProgressBarColor(percent))} 
              />
            </div>
            <span className="text-sm font-bold tabular-nums shrink-0">
              {formatValue(category.margin)}
            </span>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded text-center tabular-nums shrink-0",
              getBgColor(percent),
              getPercentColor(percent)
            )}>
              {percent}%
            </span>
          </div>
          
          <div className="flex items-center gap-4 pl-6 text-xs text-muted-foreground">
            <span>Маржинальность: <span className="font-medium text-foreground">{category.marginPercent}%</span></span>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-90"
            )} />
            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", getBgColor(percent))}>
              <Icon className={cn("w-4 h-4", getPercentColor(percent))} />
            </div>
            <span className="text-sm font-medium truncate">{category.name}</span>
            <span className="text-xs text-muted-foreground ml-2">({category.marginPercent}%)</span>
          </div>
          
          <div className="grid grid-cols-[80px_100px_80px_44px] items-center gap-1">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.min(percent, 100)}%` }} 
                className={cn("h-full rounded-full transition-all", getProgressBarColor(percent))} 
              />
            </div>
            
            <span className="text-sm font-bold tabular-nums text-right">
              {formatValue(category.margin)}
            </span>
            
            <span className="text-xs text-muted-foreground text-right">
              / {formatValue(category.marginPlan)}
            </span>
            
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
                plan={category.marginPlan}
                onClick={() => onManagerClick(manager.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface MarginCategoriesAccordionProps {
  period?: FilterPeriod;
}

export const MarginCategoriesAccordion: React.FC<MarginCategoriesAccordionProps> = ({ 
  period = 'month' 
}) => {
  const navigate = useNavigate();
  
  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };
  
  const periodCategories = marginCategoriesByPeriod[period];
  const periodManagers = marginManagersDataByPeriod[period];
  
  // Build managers for each category based on their margin performance
  const getCategoryManagers = (category: MarginCategory): CategoryManager[] => {
    // Simulate category-specific performance based on overall margin
    const categoryScale = category.margin / category.marginPlan;
    return periodManagers.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      value: Math.round(m.margin.value * (category.margin / 850000)), // Scale to category
      forecast: Math.round(m.margin.forecast * (0.9 + Math.random() * 0.2)), // Add some variation
    }));
  };
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/50">
        <h3 className="text-sm font-semibold">Маржа по категориям товаров</h3>
        <p className="text-xs text-muted-foreground">Вклад категорий в общую маржинальную прибыль</p>
      </div>
      <div>
        {periodCategories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            managers={getCategoryManagers(category)}
            onManagerClick={handleManagerClick}
          />
        ))}
      </div>
    </div>
  );
};
