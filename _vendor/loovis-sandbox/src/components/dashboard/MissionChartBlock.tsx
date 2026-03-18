import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Stethoscope } from 'lucide-react';
import { getManagerAvatar, cn } from '@/lib/utils';
import { IntegratedBarChart, IntegratedBarChartDataPoint } from './IntegratedBarChart';

export interface MissionChartDataPoint {
  date: string;
  value: number;
  plan: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
  isFuture?: boolean;
}

export interface MissionManagerData {
  id: string;
  name: string;
  avatar?: string;
  diagnostics: number;
  diagnosticsPlan: number;
}

interface MissionChartBlockProps {
  chartData: MissionChartDataPoint[];
  current: number;
  plan: number;
  managers?: MissionManagerData[];
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

const getStatusColor = (current: number, plan: number): string => {
  const percent = (current / plan) * 100;
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const getManagerPercent = (current: number, plan: number): number => {
  return Math.round((current / plan) * 100);
};

const getManagerStatusColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const getManagerStatusBg = (percent: number): string => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-destructive';
};

export function MissionChartBlock({ 
  chartData, 
  current, 
  plan, 
  managers = [], 
  onManagerClick,
  className = '' 
}: MissionChartBlockProps) {
  const [isManagersOpen, setIsManagersOpen] = useState(false);
  
  const percent = Math.round((current / plan) * 100);
  const dailyPlan = Math.round(plan / chartData.length);
  
  const integratedData: IntegratedBarChartDataPoint[] = chartData.map(d => ({
    date: d.date,
    value: d.value,
    plan: d.plan || dailyPlan,
    dayOfWeek: d.dayOfWeek,
    isWeekend: d.isWeekend,
    isFuture: d.isFuture
  }));
  
  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <Stethoscope className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-semibold">Динамика диагностик</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-bold ${getStatusColor(current, plan)}`}>
            {formatNumber(current)}
          </span>
          <span className="text-sm text-muted-foreground">/ {formatNumber(plan)}</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            percent >= 100 
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : percent >= 80
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-destructive/20 text-destructive'
          }`}>
            {percent}%
          </span>
        </div>
      </div>
      
      {/* Integrated Bar Chart */}
      <IntegratedBarChart
        data={integratedData}
        height={140}
        formatValue={(v) => String(Math.round(v))}
      />
      
      {/* Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-3 text-xs px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
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
      
      {/* Managers Accordion */}
      {managers.length > 0 && (
        <Collapsible open={isManagersOpen} onOpenChange={setIsManagersOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between mt-4 pt-3 border-t border-border/50 hover:bg-muted/30 rounded-lg px-2 py-1.5 transition-colors">
              <span className="text-xs font-medium text-muted-foreground">
                Менеджеры на смене ({managers.length})
              </span>
              {isManagersOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-1">
            <div className="space-y-1.5">
              {managers.map(manager => {
                const managerPercent = getManagerPercent(manager.diagnostics, manager.diagnosticsPlan);
                return (
                  <button
                    key={manager.id}
                    onClick={() => onManagerClick?.(manager.id)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                      <AvatarFallback className="text-xs bg-amber-100 text-amber-800">
                        {manager.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate max-w-[140px]">{manager.name}</span>
                        <span className={`text-xs font-bold ${getManagerStatusColor(managerPercent)}`}>
                          {managerPercent}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${getManagerStatusBg(managerPercent)}`}
                            style={{ width: `${Math.min(managerPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {manager.diagnostics}/{manager.diagnosticsPlan}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
