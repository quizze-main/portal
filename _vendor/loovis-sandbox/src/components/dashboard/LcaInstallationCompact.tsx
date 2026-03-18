import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Smartphone, Users } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { FilterPeriod } from './FilterBar';
import { lcaDataByPeriod } from '@/data/periodData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface LcaInstallationCompactProps {
  period?: FilterPeriod;
}

export const LcaInstallationCompact: React.FC<LcaInstallationCompactProps> = ({ 
  period = 'month' 
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const data = lcaDataByPeriod[period];
  
  const conversionPercent = data.clientsWithoutLca > 0 
    ? Math.round((data.installations / data.clientsWithoutLca) * 100) 
    : 0;

  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };

  return (
    <div>
      {/* Summary Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="text-sm">Без ЛКА:</span>
          <span className="font-semibold text-foreground">{data.clientsWithoutLca}</span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Smartphone className="w-4 h-4" />
          <span className="text-sm">Установок:</span>
          <span className="font-semibold text-foreground">{data.installations}</span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-muted-foreground">Конв.</span>
          <span className={cn("text-sm font-bold", getPercentColor(conversionPercent))}>
            {conversionPercent}%
          </span>
        </div>
        
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {/* Expanded Managers List */}
      {isExpanded && (
        <div className="bg-muted/30 border-t divide-y">
          {data.managers
            .sort((a, b) => {
              const aConv = a.clientsWithoutLca > 0 ? a.installations / a.clientsWithoutLca : 0;
              const bConv = b.clientsWithoutLca > 0 ? b.installations / b.clientsWithoutLca : 0;
              return bConv - aConv;
            })
            .map((manager) => {
              const mgrConversion = manager.clientsWithoutLca > 0 
                ? Math.round((manager.installations / manager.clientsWithoutLca) * 100) 
                : 0;
              const initials = manager.name.split(' ').map(n => n[0]).join('').slice(0, 2);
              
              return (
                <button
                  key={manager.id}
                  onClick={() => handleManagerClick(manager.id)}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-muted/60 transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getManagerAvatar(manager.id)} />
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="text-xs font-medium truncate flex-1 text-left max-w-[100px]">
                    {manager.name}
                  </span>
                  
                  <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                    <span>{manager.installations}</span>
                    <span>/</span>
                    <span>{manager.clientsWithoutLca}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 w-[56px]">
                    <div className="w-6 h-1 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", getProgressBarColor(mgrConversion))}
                        style={{ width: `${Math.min(mgrConversion, 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-[10px] font-bold tabular-nums", getPercentColor(mgrConversion))}>
                      {mgrConversion}%
                    </span>
                  </div>
                  
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
};
