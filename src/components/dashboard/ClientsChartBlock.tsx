import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChartDataPoint {
  date: string;
  value: number;
  plan?: number;
  revenue?: number;
  revenuePlan?: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
}

interface ClientManagerData {
  id: string;
  name: string;
  avatar?: string;
  planPercent: number;
  clientsCount: number;
}

interface ClientsChartBlockProps {
  current: number;
  plan: number;
  totalRevenue: number;
  revenuePlan: number;
  chartData: ChartDataPoint[];
  status: 'good' | 'warning' | 'critical';
  managers: ClientManagerData[];
  onManagerClick: (id: string) => void;
  className?: string;
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'good': return 'hsl(var(--success))';
    case 'warning': return 'hsl(var(--warning))';
    case 'critical': return 'hsl(var(--destructive))';
    default: return 'hsl(var(--primary))';
  }
};

const getManagerStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 100) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

const getManagerStatusColor = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'good': return 'text-success';
    case 'warning': return 'text-warning';
    case 'critical': return 'text-destructive';
  }
};

const getManagerStatusBg = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'good': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'critical': return 'bg-destructive';
  }
};

interface BarTooltipProps {
  day: ChartDataPoint;
  dailyPlan: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' ₽';
};

const BarTooltipContent: React.FC<BarTooltipProps> = ({ day, dailyPlan }) => {
  const fact = day.value;
  const planValue = day.plan || dailyPlan;
  const percent = planValue > 0 ? Math.round((fact / planValue) * 100) : 0;
  
  return (
    <div className="text-xs min-w-[140px]">
      <div className="font-bold text-foreground mb-1.5">{day.date} декабря</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Факт ФЛ:</span>
          <span className="font-bold text-foreground">{formatNumber(fact)} чел.</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">План ФЛ:</span>
          <span className="font-medium text-muted-foreground">{formatNumber(planValue)} чел.</span>
        </div>
        {day.revenue !== undefined && (
          <>
            <div className="border-t border-border my-1.5" />
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Выручка:</span>
              <span className="font-bold text-foreground">{formatCurrency(day.revenue)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">План выр.:</span>
              <span className="font-medium text-muted-foreground">{formatCurrency(day.revenuePlan || 0)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between gap-3 pt-1 border-t border-border">
          <span className="text-muted-foreground">Выполнение:</span>
          <span className={cn("font-bold", percent >= 100 ? "text-success" : "text-destructive")}>
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const ClientsChartBlock: React.FC<ClientsChartBlockProps> = ({
  current,
  plan,
  totalRevenue,
  revenuePlan,
  chartData,
  status,
  managers,
  onManagerClick,
  className = ''
}) => {
  const [isManagersOpen, setIsManagersOpen] = useState(true);
  const percentage = Math.round((current / plan) * 100);
  const revenuePercent = revenuePlan > 0 ? Math.round((totalRevenue / revenuePlan) * 100) : 0;
  const statusColor = getStatusColor(status);
  
  const dailyPlan = chartData.length > 0 ? (chartData[0]?.plan || plan / 30) : plan / 30;
  
  const deviations = chartData.map(d => d.value - (d.plan || dailyPlan));
  const maxDeviation = Math.max(...deviations.map(Math.abs), 1);

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden shadow-sm ${className}`}>
      <div className="p-4 pb-3">
        {/* Header with clients count */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Количество ФЛ</h3>
          </div>
          <div className="flex items-baseline gap-1.5 flex-shrink-0">
            <span className="text-lg font-bold" style={{ color: statusColor }}>
              {formatNumber(current)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatNumber(plan)} чел.
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

        {/* Revenue row */}
        <div className="flex items-center justify-end mb-2">
          <div className="flex items-baseline gap-1.5 text-xs">
            <span className="text-muted-foreground">Выручка:</span>
            <span className="font-semibold text-foreground">{formatCurrency(totalRevenue)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{formatCurrency(revenuePlan)}</span>
            <span 
              className={cn(
                "font-bold px-1.5 py-0.5 rounded-full",
                revenuePercent >= 100 
                  ? "text-success bg-success/12" 
                  : revenuePercent >= 70 
                    ? "text-warning bg-warning/12"
                    : "text-destructive bg-destructive/12"
              )}
            >
              {revenuePercent}%
            </span>
          </div>
        </div>

        <TooltipProvider delayDuration={0} skipDelayDuration={300}>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex pb-2 min-w-[780px] md:min-w-0">
              {chartData.map((day, index) => {
                const planValue = day.plan || dailyPlan;
                const isAbovePlan = day.value >= planValue;
                const deviation = day.value - planValue;
                const barHeightPercent = (Math.abs(deviation) / maxDeviation) * 100;
                const barHeight = Math.max(barHeightPercent * 0.5, 4);
                
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center flex-1 min-w-[26px] cursor-pointer hover:bg-muted/30 rounded transition-colors py-0.5">
                        <div className="h-14 md:h-16 flex flex-col items-center justify-end">
                          {isAbovePlan && (
                            <>
                              <span className="text-[9px] md:text-[10px] font-bold text-success tabular-nums leading-none mb-0.5">
                                {day.value}
                              </span>
                              <div 
                                className="w-2.5 bg-success rounded-t transition-all"
                                style={{ height: `${barHeight}px` }}
                              />
                            </>
                          )}
                        </div>
                        
                        <div className="w-full h-[2px] bg-primary/40" />
                        
                        <div className="h-14 md:h-16 flex flex-col items-center justify-start">
                          {!isAbovePlan && (
                            <>
                              <div 
                                className="w-2.5 bg-destructive rounded-b transition-all"
                                style={{ height: `${barHeight}px` }}
                              />
                              <span className="text-[9px] md:text-[10px] font-bold text-destructive tabular-nums leading-none mt-0.5">
                                {day.value}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Date label with day of week */}
                        <div className="flex flex-col items-center mt-1 leading-none">
                          <span className="text-[9px] md:text-[10px] font-medium text-muted-foreground">
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
                    <TooltipContent side="top" className="p-2.5">
                      <BarTooltipContent day={day} dailyPlan={dailyPlan} />
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
              План/день: <span className="font-medium text-foreground">{formatNumber(dailyPlan)} чел.</span>
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <button
          onClick={() => setIsManagersOpen(!isManagersOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isManagersOpen ? '' : '-rotate-90'}`} />
            <span className="text-sm font-semibold text-foreground">Менеджеры на смене</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {managers.length}
            </span>
          </div>
        </button>

        <div 
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isManagersOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-3 space-y-0.5">
            {managers.map((manager) => {
              const managerStatus = getManagerStatus(manager.planPercent);
              return (
                <button
                  key={manager.id}
                  onClick={() => onManagerClick(manager.id)}
                  className="w-full flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/40 transition-all duration-200 text-left group"
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={manager.avatar} />
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">
                      {manager.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                        {manager.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${getManagerStatusColor(managerStatus)}`}>
                          {manager.planPercent}%
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatNumber(manager.clientsCount)} чел.
                        </span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getManagerStatusBg(managerStatus)} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.min(manager.planPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
