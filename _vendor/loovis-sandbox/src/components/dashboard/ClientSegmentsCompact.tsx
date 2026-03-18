import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, UserPlus, RefreshCw, Clock, ArrowRightLeft } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { FilterPeriod } from './FilterBar';
import { clientSegmentsByPeriod } from '@/data/periodData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const segmentIcons: Record<string, React.ElementType> = {
  'new': UserPlus,
  'repeat': RefreshCw,
  'lapsed': Clock,
};

const getPercentColor = (percent: number) => {
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
};

const getProgressBarColor = (percent: number) => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

interface SegmentManager {
  id: string;
  name: string;
  avatar?: string;
  count: number;
  plan: number;
  conversion: number;
}

interface ClientSegment {
  id: string;
  name: string;
  count: number;
  plan: number;
  conversion: number;
  conversionTarget: number;
  managers: SegmentManager[];
}

interface ClientSegmentsCompactProps {
  period?: FilterPeriod;
}

export const ClientSegmentsCompact: React.FC<ClientSegmentsCompactProps> = ({ 
  period = 'month' 
}) => {
  const navigate = useNavigate();
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const segments = clientSegmentsByPeriod[period];

  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };

  return (
    <div className="divide-y">
      {segments.map((segment) => {
        const planPercent = segment.plan > 0 ? Math.round((segment.count / segment.plan) * 100) : 0;
        const Icon = segmentIcons[segment.id] || UserPlus;
        const isExpanded = expandedSegment === segment.id;
        const conversionDeviation = segment.conversionValue - segment.conversionTarget;
        
        return (
          <div key={segment.id}>
            {/* Segment Header */}
            <button
              onClick={() => setExpandedSegment(isExpanded ? null : segment.id)}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm truncate">{segment.name}</span>
              </div>
              
              {/* Fact/Plan */}
              <div className="flex items-center gap-1.5 text-sm tabular-nums">
                <span className="font-semibold">{segment.count}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{segment.plan}</span>
              </div>
              
              {/* Plan % with progress */}
              <div className="flex items-center gap-2 w-[72px]">
                <div className="w-8 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", getProgressBarColor(planPercent))}
                    style={{ width: `${Math.min(planPercent, 100)}%` }}
                  />
                </div>
                <span className={cn("text-xs font-bold tabular-nums", getPercentColor(planPercent))}>
                  {planPercent}%
                </span>
              </div>
              
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-muted/30 border-t">
                {/* Conversion info */}
                <div className="px-3 py-2 flex items-center justify-between border-b bg-muted/40">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Конверсия</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">{segment.conversionValue}%</span>
                    <span className="text-muted-foreground">цель {segment.conversionTarget}%</span>
                    <span className={cn(
                      "font-medium",
                      conversionDeviation >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {conversionDeviation >= 0 ? '+' : ''}{conversionDeviation.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Managers list - 3 column grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2">
                  {segment.managers
                    .sort((a, b) => {
                      const aPercent = a.plan > 0 ? a.count / a.plan : 0;
                      const bPercent = b.plan > 0 ? b.count / b.plan : 0;
                      return bPercent - aPercent;
                    })
                    .map((manager) => {
                      const mgrPercent = manager.plan > 0 ? Math.round((manager.count / manager.plan) * 100) : 0;
                      const initials = manager.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                      
                      return (
                        <button
                          key={manager.id}
                          onClick={() => handleManagerClick(manager.id)}
                          className="flex flex-col items-start p-1.5 rounded hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarImage src={getManagerAvatar(manager.id)} />
                              <AvatarFallback className="text-[9px] bg-primary/10">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium truncate max-w-[80px]">
                              {manager.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1 w-full pl-6">
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {manager.count}/{manager.plan}
                            </span>
                            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden max-w-[32px]">
                              <div 
                                className={cn("h-full rounded-full", getProgressBarColor(mgrPercent))}
                                style={{ width: `${Math.min(mgrPercent, 100)}%` }}
                              />
                            </div>
                            <span className={cn("text-[10px] font-bold tabular-nums", getPercentColor(mgrPercent))}>
                              {mgrPercent}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
