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

interface TrafficSource {
  id: string;
  name: string;
  count: number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
  previousPeriodCount?: number;
}

interface TrafficSourcesGridProps {
  period?: FilterPeriod;
}

export const TrafficSourcesGrid: React.FC<TrafficSourcesGridProps> = ({ 
  period = 'month' 
}) => {
  const sources = trafficSourcesByPeriod[period];
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/60">
        <h3 className="font-semibold text-foreground text-sm">Источники трафика</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Источник</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Кол-во</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[120px]">Доля</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-[50px]">Тренд</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source, index) => {
              const Icon = sourceIcons[source.id] || MoreHorizontal;
              const iconColor = sourceColors[source.id] || 'text-muted-foreground';
              
              const TrendIcon = source.trend === 'up' ? TrendingUp : source.trend === 'down' ? TrendingDown : Minus;
              const trendColor = source.trend === 'up' ? 'text-emerald-500' : source.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
              
              return (
                <tr 
                  key={source.id}
                  className={cn(
                    "border-b last:border-b-0 transition-colors",
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  )}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />
                      <span className="font-medium text-foreground">{source.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatNumber(source.count)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${Math.min(source.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-foreground w-[32px] text-right">
                        {source.percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TrendIcon className={cn("w-4 h-4 mx-auto", trendColor)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
