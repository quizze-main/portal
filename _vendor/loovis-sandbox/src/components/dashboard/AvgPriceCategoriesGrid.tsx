import React from 'react';
import { Glasses, Frame, Wrench, Circle, Sparkles, CircleDot } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

export interface AvgPriceCategory {
  id: string;
  name: string;
  current: number;
  plan: number;
  unit: string;
}

interface AvgPriceCategoriesGridProps {
  categories: AvgPriceCategory[];
  className?: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  'glasses_complete': Glasses,
  'frame': Frame,
  'manufacturing': Wrench,
  'lens': Circle,
  'design_share': Sparkles,
  'design_lens': CircleDot,
};

const getStatusColor = (current: number, plan: number) => {
  const percent = (current / plan) * 100;
  if (percent >= 100) return { text: 'text-success', bg: 'bg-success', bgLight: 'bg-success/10' };
  if (percent >= 80) return { text: 'text-warning', bg: 'bg-warning', bgLight: 'bg-warning/10' };
  return { text: 'text-destructive', bg: 'bg-destructive', bgLight: 'bg-destructive/10' };
};

interface CategoryCardProps {
  category: AvgPriceCategory;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const percent = Math.round((category.current / category.plan) * 100);
  const status = getStatusColor(category.current, category.plan);
  const Icon = categoryIcons[category.id] || Circle;
  
  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value}%`;
    return `${formatNumber(value)} ₽`;
  };
  
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${status.bgLight}`}>
          <Icon className={`w-4 h-4 ${status.text}`} />
        </div>
        <span className={`text-sm font-bold ${status.text}`}>
          {percent}%
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{category.name}</p>
      
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-base font-bold text-foreground">
          {formatValue(category.current, category.unit)}
        </span>
        <span className="text-xs text-muted-foreground">
          / {formatValue(category.plan, category.unit)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${status.bg} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
};

export const AvgPriceCategoriesGrid: React.FC<AvgPriceCategoriesGridProps> = ({
  categories,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
};
