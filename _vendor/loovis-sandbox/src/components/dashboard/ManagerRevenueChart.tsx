import { Card } from '@/components/ui/card';
import { formatFull } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  date: string;
  value: number;
  plan: number;
}

interface ManagerRevenueChartProps {
  data: ChartDataPoint[];
  currentRevenue: number;
  planRevenue: number;
  forecast?: number;
  className?: string;
}

const formatCurrency = (value: number) => formatFull(value, '₽');

export function ManagerRevenueChart({
  data,
  currentRevenue,
  planRevenue,
  forecast,
  className
}: ManagerRevenueChartProps) {
  const percent = Math.round((currentRevenue / planRevenue) * 100);
  const isGood = percent >= 100;
  const isWarning = percent >= 80 && percent < 100;

  // Calculate max deviation for scaling
  const maxDeviation = Math.max(
    ...data.map(d => Math.abs(d.value - d.plan))
  );

  return (
    <Card className={cn("p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Выручка по дням</h3>
          <p className="text-xs text-muted-foreground">
            План: {formatCurrency(planRevenue)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">
            {formatCurrency(currentRevenue)}
          </div>
          <div className={cn(
            "text-xs font-medium",
            isGood ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-destructive"
          )}>
            {percent}% от плана
            {forecast && <span className="text-muted-foreground ml-1">(прогноз {forecast}%)</span>}
          </div>
        </div>
      </div>

      {/* Diverging Bar Chart */}
      <div className="relative h-24">
        {/* Plan baseline */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-border/50 -translate-y-1/2" />
        
        {/* Bars container */}
        <div className="flex items-center h-full gap-0.5">
          {data.map((point, index) => {
            const deviation = point.value - point.plan;
            const isPositive = deviation >= 0;
            const barHeight = maxDeviation > 0 
              ? Math.abs(deviation) / maxDeviation * 40 
              : 0;
            
            return (
              <div 
                key={index}
                className="flex-1 min-w-0 h-full flex flex-col items-center justify-center relative group"
              >
                {/* Bar */}
                <div 
                  className={cn(
                    "w-2 rounded-sm transition-all",
                    isPositive ? "bg-emerald-500" : "bg-destructive"
                  )}
                  style={{
                    height: `${barHeight}px`,
                    marginTop: isPositive ? 'auto' : undefined,
                    marginBottom: isPositive ? undefined : 'auto',
                    transform: `translateY(${isPositive ? '-50%' : '50%'})`
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                    <div className="font-medium">{point.date}</div>
                    <div className="text-muted-foreground">Факт: {formatCurrency(point.value)}</div>
                    <div className="text-muted-foreground">План: {formatCurrency(point.plan)}</div>
                    <div className={cn(
                      "font-medium",
                      isPositive ? "text-emerald-600" : "text-destructive"
                    )}>
                      {isPositive ? '+' : ''}{formatCurrency(deviation)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-emerald-500" />
          <span>Выше плана</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-destructive" />
          <span>Ниже плана</span>
        </div>
      </div>
    </Card>
  );
}
