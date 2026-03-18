import React from 'react';
import { cn, getManagerAvatar } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarginChartDataPoint, MarginManagerShiftData } from '@/data/marginData';
import { IntegratedBarChart, IntegratedBarChartDataPoint } from './IntegratedBarChart';

interface MarginChartBlockProps {
  chartData: MarginChartDataPoint[];
  current: number;
  plan: number;
  managers?: MarginManagerShiftData[];
  onManagerClick?: (managerId: string) => void;
  title?: string;
  className?: string;
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return String(Math.round(value));
};

const getStatusColor = (current: number, plan: number) => {
  const percent = (current / plan) * 100;
  if (percent >= 100) return 'hsl(var(--success))';
  if (percent >= 80) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
};

const getPercentColor = (percent: number) => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressBarColor = (percent: number) => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2).toUpperCase();
};

export const MarginChartBlock: React.FC<MarginChartBlockProps> = ({
  chartData,
  current,
  plan,
  managers = [],
  onManagerClick,
  title = 'Динамика маржи',
  className = ''
}) => {
  const percentage = Math.round((current / plan) * 100);
  const statusColor = getStatusColor(current, plan);
  const status = percentage >= 100 ? 'good' : percentage >= 80 ? 'warning' : 'critical';
  
  // Transform chartData for IntegratedBarChart
  const integratedData: IntegratedBarChartDataPoint[] = chartData.map(d => ({
    date: d.date,
    value: d.value,
    plan: d.plan,
    dayOfWeek: d.dayOfWeek,
    isWeekend: d.isWeekend,
    isFuture: d.isFuture
  }));

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

        <div className="flex gap-4">
          {/* Chart Area */}
          <div className="flex-1 min-w-0">
            <IntegratedBarChart
              data={integratedData}
              height={140}
              formatValue={formatCompact}
            />

            {/* Legend */}
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-[2px] bg-muted-foreground/60 rounded" />
                  <span className="text-muted-foreground">Линия плана</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full border-2 border-muted-foreground/50 bg-background" />
                  <span className="text-muted-foreground">Прогноз</span>
                </div>
              </div>
            </div>
          </div>

          {/* Managers sidebar - desktop only */}
          {managers.length > 0 && (
            <div className="hidden lg:block w-56 border-l border-border pl-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Менеджеры</h4>
              <div className="space-y-2">
                {managers.map((manager) => (
                  <button
                    key={manager.id}
                    onClick={() => onManagerClick?.(manager.id)}
                    className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={getManagerAvatar(manager.id)} />
                      <AvatarFallback className="text-[9px] bg-primary/10">
                        {getInitials(manager.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium truncate">{manager.name.split(' ')[0]}</span>
                        <span className={cn("text-xs font-bold", getPercentColor(manager.planPercent))}>
                          {manager.planPercent}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", getProgressBarColor(manager.planPercent))}
                            style={{ width: `${Math.min(manager.planPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatCompact(manager.margin)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
