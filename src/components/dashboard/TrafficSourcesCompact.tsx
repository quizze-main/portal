import React from 'react';
import { Footprints, Globe, Phone, Users, Stethoscope, MoreHorizontal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterPeriod } from './FilterBar';
import { trafficSourcesByPeriod } from '@/data/periodData';

const sourceIcons: Record<string, React.ElementType> = {
  'walk_in': Footprints,
  'online': Globe,
  'calls': Phone,
  'referral': Users,
  'doctors': Stethoscope,
  'other': MoreHorizontal,
};

const sourceColors: Record<string, string> = {
  'walk_in': 'text-blue-500',
  'online': 'text-purple-500',
  'calls': 'text-green-500',
  'referral': 'text-amber-500',
  'doctors': 'text-rose-500',
  'other': 'text-muted-foreground',
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

interface TrafficSourcesCompactProps {
  period?: FilterPeriod;
}

export const TrafficSourcesCompact: React.FC<TrafficSourcesCompactProps> = ({ 
  period = 'month' 
}) => {
  const sources = trafficSourcesByPeriod[period];
  
  return (
    <div className="divide-y">
      {sources.map((source) => {
        const Icon = sourceIcons[source.id] || MoreHorizontal;
        const iconColor = sourceColors[source.id] || 'text-muted-foreground';
        
        const TrendIcon = source.trend === 'up' ? TrendingUp : source.trend === 'down' ? TrendingDown : Minus;
        const trendColor = source.trend === 'up' ? 'text-emerald-500' : source.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
        
        return (
          <div 
            key={source.id}
            className="px-3 py-2 flex items-center gap-3"
          >
            <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />
            
            <span className="text-sm font-medium truncate flex-1 min-w-0">
              {source.name}
            </span>
            
            <span className="text-sm font-semibold tabular-nums">
              {formatNumber(source.count)}
            </span>
            
            <div className="flex items-center gap-1.5 w-[64px]">
              <div className="w-8 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.min(source.percentage, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground w-[28px] text-right">
                {source.percentage}%
              </span>
            </div>
            
            <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
          </div>
        );
      })}
    </div>
  );
};
