import { cn } from '@/lib/utils';

interface Conversion {
  id: string;
  name: string;
  value: number;
  target: number;
  count?: number;
  countLabel?: string;
}

interface ConversionGaugesProps {
  conversions: Conversion[];
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

const GaugeChart = ({ 
  value, 
  target, 
  status 
}: { 
  value: number; 
  target: number; 
  status: 'good' | 'warning' | 'critical';
}) => {
  const percentage = Math.min((value / target) * 100, 100);
  const strokeColor = getStatusColor(status);
  
  // Semi-circle gauge
  const radius = 40;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative w-24 h-14">
      <svg 
        viewBox="0 0 100 55" 
        className="w-full h-full"
      >
        {/* Background arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Value in center */}
      <div className="absolute inset-0 flex items-end justify-center pb-0">
        <span className={cn(
          "text-lg font-bold",
          status === 'critical' ? 'text-destructive' : 'text-foreground'
        )}>
          {value}%
        </span>
      </div>
    </div>
  );
};

export function ConversionGauges({ conversions, className }: ConversionGaugesProps) {
  return (
    <div className={cn("bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b border-border/30">
        <h4 className="text-sm font-semibold text-foreground">Конверсии</h4>
      </div>
      
      {/* Gauges grid */}
      <div className="grid grid-cols-2 divide-x divide-border/30">
        {conversions.map((conversion) => {
          const status = getStatus(conversion.value, conversion.target);
          
          return (
            <div key={conversion.id} className="p-4 flex flex-col items-center">
              <GaugeChart 
                value={conversion.value} 
                target={conversion.target}
                status={status}
              />
              
              {/* Label */}
              <div className="text-xs text-muted-foreground text-center mt-2 leading-tight">
                {conversion.name}
              </div>
              
              {/* Target */}
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                цель: {conversion.target}%
              </div>
              
              {/* Count if available */}
              {conversion.count !== undefined && (
                <div className="mt-2 px-2 py-1 bg-secondary/50 rounded-md">
                  <span className="text-xs font-medium text-foreground">{conversion.count}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">{conversion.countLabel}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
