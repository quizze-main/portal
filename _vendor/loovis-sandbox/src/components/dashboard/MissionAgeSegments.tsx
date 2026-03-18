import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Users, Baby, User, UserCheck } from 'lucide-react';
import { getManagerAvatar } from '@/lib/utils';

export interface AgeSegmentManager {
  id: string;
  name: string;
  avatar?: string;
  count: number;
  plan: number;
}

export interface AgeSegment {
  id: string;
  label: string;
  ageRange: string;
  count: number;
  plan: number;
  icon: 'baby' | 'child' | 'adult' | 'senior';
  isPriority?: boolean;
  managers: AgeSegmentManager[];
}

interface MissionAgeSegmentsProps {
  segments: AgeSegment[];
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

const getSegmentIcon = (icon: AgeSegment['icon']) => {
  switch (icon) {
    case 'baby':
      return <Baby className="w-4 h-4" />;
    case 'child':
      return <User className="w-4 h-4" />;
    case 'adult':
      return <UserCheck className="w-4 h-4" />;
    case 'senior':
      return <Users className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const getProgressBg = (percent: number, isPriority?: boolean): string => {
  if (isPriority) {
    if (percent >= 100) return 'bg-gradient-to-r from-amber-400 to-yellow-400';
    if (percent >= 80) return 'bg-gradient-to-r from-amber-500 to-orange-400';
    return 'bg-gradient-to-r from-orange-500 to-red-400';
  }
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-destructive';
};

function SegmentItem({ 
  segment, 
  onManagerClick 
}: { 
  segment: AgeSegment; 
  onManagerClick?: (managerId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const percent = Math.round((segment.count / segment.plan) * 100);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={`w-full p-3 rounded-xl border transition-all ${
          segment.isPriority 
            ? 'bg-gradient-to-r from-amber-50/80 to-yellow-50/60 dark:from-amber-950/30 dark:to-yellow-950/20 border-amber-200/50 dark:border-amber-800/30 hover:shadow-md'
            : 'bg-background/50 border-border/50 hover:bg-muted/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              segment.isPriority 
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              {getSegmentIcon(segment.icon)}
            </div>
            
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{segment.label}</span>
                <span className="text-[10px] text-muted-foreground">({segment.ageRange})</span>
                {segment.isPriority && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    Приоритет
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressBg(percent, segment.isPriority)}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-bold min-w-[36px] text-right ${getPercentColor(percent)}`}>
                  {percent}%
                </span>
              </div>
            </div>
            
            <div className="text-right mr-1">
              <div className="text-sm font-bold">{formatNumber(segment.count)}</div>
              <div className="text-[10px] text-muted-foreground">/ {formatNumber(segment.plan)}</div>
            </div>
            
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-4">
          {segment.managers.map(manager => {
            const managerPercent = Math.round((manager.count / manager.plan) * 100);
            return (
              <button
                key={manager.id}
                onClick={() => onManagerClick?.(manager.id)}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                  <AvatarFallback className="text-[10px] bg-amber-100 text-amber-800">
                    {manager.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{manager.name.split(' ')[0]}</div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold ${getPercentColor(managerPercent)}`}>
                      {manager.count}/{manager.plan}
                    </span>
                    <div className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getProgressBg(managerPercent, segment.isPriority)}`}
                        style={{ width: `${Math.min(managerPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MissionAgeSegments({ segments, onManagerClick, className = '' }: MissionAgeSegmentsProps) {
  const totalCount = segments.reduce((sum, s) => sum + s.count, 0);
  const totalPlan = segments.reduce((sum, s) => sum + s.plan, 0);
  const totalPercent = Math.round((totalCount / totalPlan) * 100);
  
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-sm font-semibold">Возрастные сегменты</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${getPercentColor(totalPercent)}`}>
            {formatNumber(totalCount)}
          </span>
          <span className="text-xs text-muted-foreground">/ {formatNumber(totalPlan)}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {segments.map(segment => (
          <SegmentItem 
            key={segment.id} 
            segment={segment} 
            onManagerClick={onManagerClick}
          />
        ))}
      </div>
    </Card>
  );
}
