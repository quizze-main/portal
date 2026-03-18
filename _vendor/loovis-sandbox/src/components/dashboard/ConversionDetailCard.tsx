import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { KPIGaugeChart } from './KPIGaugeChart';
import type { ConversionDetailDataV2 } from '@/data/conversionData';

interface ConversionDetailCardProps {
  conversion: ConversionDetailDataV2;
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

const getStatusColor = (percent: number): string => {
  if (percent >= 95) return 'text-emerald-600';
  if (percent >= 70) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressColor = (percent: number): string => {
  if (percent >= 95) return 'bg-emerald-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace('.0', '') + ' млн ₽';
  }
  if (value >= 1000) {
    return Math.round(value / 1000) + ' тыс ₽';
  }
  return value.toLocaleString('ru-RU') + ' ₽';
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

export function ConversionDetailCard({ conversion, onManagerClick, className }: ConversionDetailCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const deviation = conversion.value - conversion.target;
  const inputPercent = Math.round((conversion.inputFact / conversion.inputPlan) * 100);
  const outputPercent = Math.round((conversion.outputFact / conversion.outputPlan) * 100);

  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header - clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <KPIGaugeChart value={deviation} size={64} />
            <span className="text-[10px] text-muted-foreground mt-0.5">отклонение</span>
          </div>
          
          {/* Info */}
          <div className="text-left">
            <div className="text-sm font-medium text-foreground">{conversion.name}</div>
            <div className="text-xs text-muted-foreground">
              факт: <span className={getStatusColor(Math.round((conversion.value / conversion.target) * 100))}>{conversion.value}%</span> / цель: {conversion.target}%
            </div>
          </div>
        </div>
        
        {/* Lost summary */}
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">Упущено</div>
          <div className="text-sm font-medium text-destructive">−{formatCurrency(conversion.lostAmount)}</div>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-0 space-y-4">
          {/* Absolute values block */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            {/* Flow visualization */}
            <div className="flex items-center justify-between gap-4">
              {/* Input */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{conversion.inputLabel}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", getProgressColor(inputPercent).replace('bg-', 'bg-opacity-10 text-').replace('-500', '-600'))}>
                    {inputPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{conversion.inputFact}</span>
                  <span className="text-xs text-muted-foreground">/ {conversion.inputPlan}</span>
                </div>
                <div className="mt-1.5">
                  <Progress 
                    value={Math.min(inputPercent, 100)} 
                    className="h-1.5" 
                  />
                </div>
              </div>
              
              {/* Arrow */}
              <div className="flex flex-col items-center shrink-0 px-2">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <span className={cn("text-xs font-medium mt-0.5", getStatusColor(Math.round((conversion.value / conversion.target) * 100)))}>
                  {conversion.value}%
                </span>
              </div>
              
              {/* Output */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{conversion.outputLabel}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", getProgressColor(outputPercent).replace('bg-', 'bg-opacity-10 text-').replace('-500', '-600'))}>
                    {outputPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{conversion.outputFact}</span>
                  <span className="text-xs text-muted-foreground">/ {conversion.outputPlan}</span>
                </div>
                <div className="mt-1.5">
                  <Progress 
                    value={Math.min(outputPercent, 100)} 
                    className="h-1.5" 
                  />
                </div>
              </div>
            </div>
            
            {/* Lost row */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-sm text-destructive font-medium">Упущено</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-destructive">
                  {conversion.lostCount} {conversion.outputLabel.toLowerCase()}
                </span>
                <span className="text-sm font-bold text-destructive">
                  ≈ −{formatCurrency(conversion.lostAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Managers section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              По менеджерам
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {conversion.managers.map((manager) => {
                const managerPercent = Math.round((manager.value / manager.target) * 100);
                
                return (
                  <button
                    key={manager.id}
                    onClick={() => onManagerClick?.(manager.id)}
                    className="bg-muted/40 hover:bg-muted/60 rounded-lg p-3 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(manager.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {manager.name}
                        </p>
                        {manager.role && (
                          <p className="text-xs text-muted-foreground truncate">{manager.role}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {manager.inputFact} → {manager.outputFact}
                      </div>
                      <div className={cn("text-sm font-bold", getStatusColor(managerPercent))}>
                        {manager.value}%
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min(managerPercent, 100)} 
                      className="h-1 mt-1.5" 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
