import { Card, CardContent } from '@/components/ui/card';
import { Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIGaugeChart } from './KPIGaugeChart';

interface ConversionMetric {
  current: number;
  plan: number;
}

interface ConversionDetail {
  id: string;
  name: string;
  value: number;
  target: number;
}

interface ManagerConversionBlockProps {
  conversion: ConversionMetric;
  conversions: ConversionDetail[];
  className?: string;
}

export function ManagerConversionBlock({ 
  conversion,
  conversions,
  className 
}: ManagerConversionBlockProps) {
  const convPercent = Math.round((conversion.current / conversion.plan) * 100);

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-100 text-emerald-700';
    if (percent >= 85) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  // Deviation gauge using KPIGaugeChart - aligned with donut widgets
  const DeviationGauge = ({ value, target }: { value: number; target: number }) => {
    const deviation = value - target;
    
    return (
      <div className="flex-shrink-0">
        <KPIGaugeChart value={deviation} size={56} />
      </div>
    );
  };

  // Conversion item matching the "Created Orders" page style
  const ConversionItem = ({ value, target, label }: { value: number; target: number; label: string }) => {
    return (
      <div className="flex items-start gap-2 p-2 sm:p-3">
        <DeviationGauge value={value} target={target} />
        <div className="flex-1 min-w-0 pt-2">
          <div className="text-xs sm:text-sm font-medium text-foreground leading-tight line-clamp-2">
            {label}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            факт: {value}% / цель: {target}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        {/* Header with gradient background */}
        <div className="flex items-center justify-between mb-3 -mx-3 -mt-3 px-3 py-2 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-emerald-100">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">Конверсии</h3>
          </div>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            getStatusBadge(convPercent)
          )}>
            {conversion.current}%
          </span>
        </div>

        {/* Conversions grid - 1 column on mobile, 2 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
          {conversions.slice(0, 2).map((conv) => (
            <ConversionItem 
              key={conv.id}
              value={conv.value}
              target={conv.target}
              label={conv.name}
            />
          ))}
        </div>

        {/* Additional conversions if any */}
        {conversions.length > 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/30 border-t border-border/30">
            {conversions.slice(2).map((conv) => (
              <ConversionItem 
                key={conv.id}
                value={conv.value}
                target={conv.target}
                label={conv.name}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}