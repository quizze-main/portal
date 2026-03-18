import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { cn, getManagerAvatar } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { KPIGaugeChart } from './KPIGaugeChart';
import type { ConversionDetailDataV2, ConversionSummary } from '@/data/conversionData';

interface ConversionCompactBlockProps {
  conversions: ConversionDetailDataV2[];
  summary: ConversionSummary;
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
  return value.toLocaleString('ru-RU') + ' ₽';
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

// Format name as "Фамилия И." (e.g., "Елена Новикова" → "Новикова Е.")
const formatShortName = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[1]} ${parts[0][0]}.`;
  }
  return name;
};

interface ConversionRowProps {
  conversion: ConversionDetailDataV2;
  isOpen: boolean;
  onToggle: () => void;
  onManagerClick?: (managerId: string) => void;
}

function ConversionRow({ conversion, isOpen, onToggle, onManagerClick }: ConversionRowProps) {
  const deviation = conversion.value - conversion.target;
  const percent = Math.round((conversion.value / conversion.target) * 100);
  const inputPercent = Math.round((conversion.inputFact / conversion.inputPlan) * 100);
  const outputPercent = Math.round((conversion.outputFact / conversion.outputPlan) * 100);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Header row - clickable */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        {/* Chevron */}
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        
        {/* Gauge */}
        <div className="shrink-0">
          <KPIGaugeChart value={deviation} size={48} />
        </div>
        
        {/* Name + values */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-foreground truncate">
            {conversion.name}
          </div>
          <div className="text-xs text-muted-foreground">
            ф: <span className={getStatusColor(percent)}>{conversion.value}%</span> / ц: {conversion.target}%
          </div>
        </div>
        
        {/* Progress bar - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 w-24">
          <Progress 
            value={Math.min(percent, 100)} 
            className="h-1.5 flex-1" 
          />
          <span className={cn("text-xs font-medium tabular-nums", getStatusColor(percent))}>
            {percent}%
          </span>
        </div>
        
        {/* Lost amount */}
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-destructive">
            −{formatCurrency(conversion.lostAmount)}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-3 pb-4 pt-1 ml-7 space-y-4">
          {/* Flow visualization */}
          <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              {/* Input */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{conversion.inputLabel}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    inputPercent >= 95 ? "bg-emerald-100 text-emerald-700" :
                    inputPercent >= 70 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {inputPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-foreground tabular-nums">{conversion.inputFact}</span>
                  <span className="text-xs text-muted-foreground">/ {conversion.inputPlan}</span>
                </div>
                <Progress value={Math.min(inputPercent, 100)} className="h-1 mt-1" />
              </div>
              
              {/* Arrow */}
              <div className="flex flex-col items-center shrink-0">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className={cn("text-xs font-medium", getStatusColor(percent))}>
                  {conversion.value}%
                </span>
              </div>
              
              {/* Output */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{conversion.outputLabel}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    outputPercent >= 95 ? "bg-emerald-100 text-emerald-700" :
                    outputPercent >= 70 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {outputPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-foreground tabular-nums">{conversion.outputFact}</span>
                  <span className="text-xs text-muted-foreground">/ {conversion.outputPlan}</span>
                </div>
                <Progress value={Math.min(outputPercent, 100)} className="h-1 mt-1" />
              </div>
            </div>
            
            {/* Lost summary */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-destructive font-medium">Упущено</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-destructive font-medium">
                  {conversion.lostCount} {conversion.outputLabel.toLowerCase()}
                </span>
                <span className="text-destructive font-bold">
                  ≈ −{formatCurrency(conversion.lostAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Managers grid */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              По менеджерам
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {conversion.managers.map((manager) => {
                const managerPercent = Math.round((manager.value / manager.target) * 100);
                
                return (
                  <button
                    key={manager.id}
                    onClick={() => onManagerClick?.(manager.id)}
                    className="bg-muted/40 hover:bg-muted/60 rounded-lg p-3 text-left transition-colors group"
                  >
                    {/* Row 1: Avatar + Name + Percent */}
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(manager.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground flex-1 group-hover:text-primary transition-colors">
                        {formatShortName(manager.name)}
                      </span>
                      <span className={cn("text-sm font-bold tabular-nums", getStatusColor(managerPercent))}>
                        {manager.value}%
                      </span>
                    </div>
                    
                    {/* Row 2: Context - input → output • target */}
                    <div className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                      {manager.inputFact} → {manager.outputFact} • цель: {manager.target}%
                    </div>
                    
                    {/* Progress bar - thicker */}
                    <Progress 
                      value={Math.min(managerPercent, 100)} 
                      className="h-2 mt-2" 
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

export function ConversionCompactBlock({ conversions, summary, onManagerClick, className }: ConversionCompactBlockProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggleConversion = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalLost = conversions.reduce((sum, c) => sum + c.lostAmount, 0);

  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Конверсии</h3>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Всего упущено: </span>
          <span className="text-sm font-bold text-destructive">−{formatCurrency(totalLost)}</span>
        </div>
      </div>

      {/* Desktop: 2-column layout */}
      <div className="hidden md:grid md:grid-cols-2 md:divide-x md:divide-border/50">
        <div>
          {conversions.slice(0, 3).map((conversion) => (
            <ConversionRow
              key={conversion.id}
              conversion={conversion}
              isOpen={openIds.has(conversion.id)}
              onToggle={() => toggleConversion(conversion.id)}
              onManagerClick={onManagerClick}
            />
          ))}
        </div>
        <div>
          {conversions.slice(3).map((conversion) => (
            <ConversionRow
              key={conversion.id}
              conversion={conversion}
              isOpen={openIds.has(conversion.id)}
              onToggle={() => toggleConversion(conversion.id)}
              onManagerClick={onManagerClick}
            />
          ))}
        </div>
      </div>

      {/* Mobile: single column */}
      <div className="md:hidden">
        {conversions.map((conversion) => (
          <ConversionRow
            key={conversion.id}
            conversion={conversion}
            isOpen={openIds.has(conversion.id)}
            onToggle={() => toggleConversion(conversion.id)}
            onManagerClick={onManagerClick}
          />
        ))}
      </div>
    </div>
  );
}
