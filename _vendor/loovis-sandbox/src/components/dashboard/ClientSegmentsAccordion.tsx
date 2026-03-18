import React, { useState } from 'react';
import { ChevronRight, UserPlus, RefreshCw, Clock } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { FilterPeriod } from './FilterBar';
import { clientSegmentsByPeriod } from '@/data/periodData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const segmentIcons: Record<string, React.ElementType> = {
  'new': UserPlus,
  'repeat': RefreshCw,
  'old_check': Clock,
};

const getPercentColor = (percent: number) => {
  if (percent >= 100) return 'text-success';
  if (percent >= 80) return 'text-warning';
  return 'text-destructive';
};

const getBgColor = (percent: number) => {
  if (percent >= 100) return 'bg-success/10';
  if (percent >= 80) return 'bg-warning/10';
  return 'bg-destructive/10';
};

const getProgressBarColor = (percent: number) => {
  if (percent >= 100) return 'bg-success';
  if (percent >= 80) return 'bg-warning';
  return 'bg-destructive';
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

interface SegmentManager {
  id: string;
  name: string;
  count: number;
  plan: number;
  conversionValue: number;
  conversionTarget: number;
}

interface ClientSegment {
  id: string;
  name: string;
  count: number;
  plan: number;
  conversionValue: number;
  conversionTarget: number;
  managers: SegmentManager[];
}

interface SegmentItemProps {
  segment: ClientSegment;
  onManagerClick: (managerId: string) => void;
}

const SegmentItem: React.FC<SegmentItemProps> = ({ segment, onManagerClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = segmentIcons[segment.id] || UserPlus;
  const percent = Math.round((segment.count / segment.plan) * 100);
  const conversionPercent = Math.round((segment.conversionValue / segment.conversionTarget) * 100);
  
  const sortedManagers = [...segment.managers].sort((a, b) => 
    Math.round((b.count / b.plan) * 100) - Math.round((a.count / a.plan) * 100)
  );
  
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full grid grid-cols-[1fr_auto] items-center py-2.5 px-3 hover:bg-muted/30 transition-colors gap-3"
      >
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
          <span className="text-sm font-medium truncate">{segment.name}</span>
        </div>
        
        <div className="grid grid-cols-[70px_80px_80px_44px] sm:grid-cols-[80px_90px_100px_44px] items-center gap-1">
          {/* Count */}
          <span className="text-sm font-bold tabular-nums text-right">
            {formatNumber(segment.count)}
          </span>
          
          {/* Plan */}
          <span className="text-xs text-muted-foreground text-right">
            / {formatNumber(segment.plan)} шт.
          </span>
          
          {/* Conversion */}
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[10px] text-muted-foreground">Конв:</span>
            <span className={cn("text-xs font-bold", getPercentColor(conversionPercent))}>
              {segment.conversionValue}%
            </span>
            <span className="text-[10px] text-muted-foreground">/{segment.conversionTarget}%</span>
          </div>
          
          {/* Percentage badge */}
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded text-center tabular-nums",
            getBgColor(percent),
            getPercentColor(percent)
          )}>
            {percent}%
          </span>
        </div>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-0.5">
            {sortedManagers.map((manager) => {
              const managerPercent = Math.round((manager.count / manager.plan) * 100);
              const managerConvPercent = Math.round((manager.conversionValue / manager.conversionTarget) * 100);
              const barPercent = Math.min((manager.count / manager.plan) * 100, 120);
              
              return (
                <button
                  key={manager.id}
                  onClick={(e) => { e.stopPropagation(); onManagerClick(manager.id); }}
                  className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={getManagerAvatar(manager.id)} />
                    <AvatarFallback className="text-[9px] bg-primary/10">
                      {manager.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="hidden sm:block text-xs font-medium w-28 truncate shrink-0">
                    {manager.name}
                  </span>
                  
                  <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden relative min-w-[60px]">
                    <div 
                      style={{ width: `${Math.min(barPercent, 100)}%` }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        getProgressBarColor(managerPercent)
                      )}
                    />
                  </div>
                  
                  <span className="text-xs font-semibold tabular-nums w-12 text-right shrink-0">
                    {formatNumber(manager.count)} шт
                  </span>
                  
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className={cn(
                      "text-[10px] font-bold",
                      getPercentColor(managerConvPercent)
                    )}>
                      {manager.conversionValue}%
                    </span>
                  </div>
                  
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[36px] text-center tabular-nums shrink-0",
                    getBgColor(managerPercent),
                    getPercentColor(managerPercent)
                  )}>
                    {managerPercent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface ClientSegmentsAccordionProps {
  period?: FilterPeriod;
}

export const ClientSegmentsAccordion: React.FC<ClientSegmentsAccordionProps> = ({ 
  period = 'month' 
}) => {
  const navigate = useNavigate();
  
  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };
  
  const segments = clientSegmentsByPeriod[period];
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/50">
        <h3 className="text-sm font-semibold">Сегменты клиентов</h3>
      </div>
      <div>
        {segments.map((segment) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            onManagerClick={handleManagerClick}
          />
        ))}
      </div>
    </div>
  );
};
