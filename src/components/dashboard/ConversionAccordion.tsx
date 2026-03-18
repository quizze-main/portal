import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIGaugeChart } from './KPIGaugeChart';

export interface ConversionDetailData {
  id: string;
  name: string;
  value: number;
  target: number;
  inputLabel: string;
  inputFact: number;
  inputPlan: number;
  outputLabel: string;
  outputFact: number;
  outputPlan: number;
  lostCount: number;
  lostAmount: number;
}

interface ConversionAccordionProps {
  conversions: ConversionDetailData[];
  className?: string;
}

const getStatus = (value: number, target: number): 'good' | 'warning' | 'critical' => {
  const percent = (value / target) * 100;
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'good': return 'hsl(var(--success))';
    case 'warning': return 'hsl(var(--primary))';
    case 'critical': return 'hsl(var(--destructive))';
  }
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
};

// Deviation gauge using KPIGaugeChart - shows deviation from target
const DeviationGauge = ({ 
  value, 
  target 
}: { 
  value: number; 
  target: number; 
}) => {
  // Calculate deviation: value - target (e.g., 42% actual vs 50% target = -8%)
  const deviation = value - target;
  
  return (
    <div className="flex flex-col items-center">
      <KPIGaugeChart value={deviation} size={64} />
      <span className="text-[10px] text-muted-foreground mt-0.5">отклонение</span>
    </div>
  );
};

function ConversionItem({ conversion }: { conversion: ConversionDetailData }) {
  const [isOpen, setIsOpen] = useState(false);
  const status = getStatus(conversion.value, conversion.target);
  
  const inputPercent = Math.round((conversion.inputFact / conversion.inputPlan) * 100);
  const outputPercent = Math.round((conversion.outputFact / conversion.outputPlan) * 100);

  return (
    <div className="border-b border-border/30 last:border-b-0 md:border-b-0 md:border-r md:border-border/30 md:odd:border-r md:even:border-r-0">
      {/* Header */}
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
          <DeviationGauge value={conversion.value} target={conversion.target} />
          <div className="text-left">
            <div className="text-sm font-medium text-foreground">{conversion.name}</div>
            <div className="text-xs text-muted-foreground">факт: {conversion.value}% / цель: {conversion.target}%</div>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
            {/* Input row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{conversion.inputLabel}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{conversion.inputFact}</span>
                <span className="text-xs text-muted-foreground">/ {conversion.inputPlan}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  inputPercent >= 95 ? 'bg-success/10 text-success' :
                  inputPercent >= 70 ? 'bg-primary/10 text-primary' :
                  'bg-destructive/10 text-destructive'
                )}>
                  {inputPercent}%
                </span>
              </div>
            </div>

            {/* Output row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{conversion.outputLabel}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{conversion.outputFact}</span>
                <span className="text-xs text-muted-foreground">/ {conversion.outputPlan}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  outputPercent >= 95 ? 'bg-success/10 text-success' :
                  outputPercent >= 70 ? 'bg-primary/10 text-primary' :
                  'bg-destructive/10 text-destructive'
                )}>
                  {outputPercent}%
                </span>
              </div>
            </div>

            {/* Lost row */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-destructive font-medium">Упущено</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-destructive">
                  {conversion.lostCount} {conversion.outputLabel.toLowerCase()}
                </span>
                <span className="text-xs text-destructive/70">
                  ≈ {formatCurrency(conversion.lostAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConversionAccordion({ conversions, className }: ConversionAccordionProps) {
  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b border-border/30">
        <h4 className="text-sm font-semibold text-foreground">Конверсии</h4>
      </div>
      
      {/* Conversion items */}
      <div className="md:grid md:grid-cols-2">
        {conversions.map((conversion) => (
          <ConversionItem key={conversion.id} conversion={conversion} />
        ))}
      </div>
    </div>
  );
}