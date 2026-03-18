import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  value: number;
  plan?: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
}

interface AvgPriceChartBlockProps {
  chartData: ChartDataPoint[];
  current: number;
  plan: number;
  title?: string;
  className?: string;
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

const formatCompact = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace('.', ',')}K`;
  }
  return String(Math.round(value));
};

const getStatusColor = (current: number, plan: number) => {
  const percent = (current / plan) * 100;
  if (percent >= 100) return 'hsl(var(--success))';
  if (percent >= 80) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
};

export const AvgPriceChartBlock: React.FC<AvgPriceChartBlockProps> = ({
  chartData,
  current,
  plan,
  title = 'Динамика средней стоимости',
  className = ''
}) => {
  const percentage = Math.round((current / plan) * 100);
  const statusColor = getStatusColor(current, plan);
  const status = percentage >= 100 ? 'good' : percentage >= 80 ? 'warning' : 'critical';
  
  // Average plan for reference line
  const avgPlan = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + (d.plan || 0), 0) / chartData.length 
    : plan;

  // Calculate max deviation for bar scaling
  const maxDeviation = Math.max(
    ...chartData.map(d => Math.abs(d.value - (d.plan || avgPlan)))
  );

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden shadow-sm ${className}`}>
      <div className="p-4 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <div className="flex items-baseline gap-1.5 flex-shrink-0">
            <span className="text-lg font-bold" style={{ color: statusColor }}>
              {formatNumber(current)} ₽
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatNumber(plan)} ₽
            </span>
            <span 
              className="text-xs font-bold px-2 py-0.5 rounded-full ml-1"
              style={{ 
                color: statusColor,
                backgroundColor: status === 'good' ? 'hsl(var(--success) / 0.12)' 
                  : status === 'warning' ? 'hsl(var(--warning) / 0.12)' 
                  : 'hsl(var(--destructive) / 0.12)'
              }}
            >
              {percentage}%
            </span>
          </div>
        </div>

        {/* Diverging Bar Chart - scrollable on mobile */}
        <TooltipProvider delayDuration={0} skipDelayDuration={300}>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex items-end justify-between gap-0.5 min-w-[780px] md:min-w-0">
              {chartData.map((day, index) => {
                const planValue = day.plan || avgPlan;
                const isAbovePlan = day.value >= planValue;
                const deviation = day.value - planValue;
                const barHeightPercent = maxDeviation > 0 ? (Math.abs(deviation) / maxDeviation) * 100 : 0;
                const barHeight = Math.max(barHeightPercent * 0.4, 3);
                const percent = Math.round((day.value / planValue) * 100);
                
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center flex-1 min-w-[26px] cursor-pointer hover:bg-muted/30 rounded transition-colors py-0.5">
                        {/* TOP AREA: Value + Bar if above plan */}
                        <div className="h-14 md:h-16 flex flex-col items-center justify-end">
                          {isAbovePlan && (
                            <>
                              <span className="text-[9px] md:text-[10px] font-bold text-success leading-none mb-0.5">
                                {formatCompact(day.value)}
                              </span>
                              <div 
                                className="w-2.5 bg-success rounded-t-sm"
                                style={{ height: `${barHeight}px` }}
                              />
                            </>
                          )}
                        </div>
                        
                        {/* CENTER: Axis line */}
                        <div className="w-full h-[2px] bg-primary/40" />
                        
                        {/* BOTTOM AREA: Bar + Value if below plan */}
                        <div className="h-14 md:h-16 flex flex-col items-center justify-start">
                          {!isAbovePlan && (
                            <>
                              <div 
                                className="w-2.5 bg-destructive rounded-b-sm"
                                style={{ height: `${barHeight}px` }}
                              />
                              <span className="text-[9px] md:text-[10px] font-bold text-destructive leading-none mt-0.5">
                                {formatCompact(day.value)}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Date label with day of week */}
                        <div className="flex flex-col items-center mt-1 leading-none">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground">
                            {day.date}
                          </span>
                          {day.dayOfWeek && (
                            <span className={cn(
                              "text-[8px] md:text-[9px] mt-0.5",
                              day.isWeekend ? "text-warning/70" : "text-muted-foreground/50"
                            )}>
                              {day.dayOfWeek}
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs p-2">
                      <div className="font-bold mb-1">{day.date} декабря</div>
                      <div>Факт: <span className={cn("font-semibold", isAbovePlan ? 'text-success' : 'text-destructive')}>{formatNumber(day.value)} ₽</span></div>
                      <div>План: {formatNumber(planValue)} ₽</div>
                      <div className="mt-1 pt-1 border-t border-border">
                        Выполнение: <span className={cn("font-semibold", isAbovePlan ? 'text-success' : 'text-destructive')}>{percent}%</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          {/* Mobile hint */}
          <p className="text-[10px] text-muted-foreground text-center mt-2 md:hidden">
            Нажмите на столбец для деталей
          </p>
        </TooltipProvider>

        {/* Compact legend with daily plan - stacked on mobile */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-3 text-xs px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-success" />
              <span className="text-muted-foreground">≥ план</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
              <span className="text-muted-foreground">&lt; план</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] bg-primary/40" />
            <span className="text-muted-foreground">
              План/день: <span className="font-medium text-foreground">{formatNumber(avgPlan)} ₽</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
