import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { cn, getManagerAvatar } from '@/lib/utils';
import { IntegratedBarChart, IntegratedBarChartDataPoint } from './IntegratedBarChart';

// Format number with spaces as thousand separators
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

// Format bar label as short number (125000 → "125")
const formatBarLabel = (value: number): string => {
  return Math.round(value / 1000).toString();
};


interface ChartDataPoint {
  date: string;
  value: number;
  plan?: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
  isFuture?: boolean;
}

interface ManagerShiftData {
  id: string;
  name: string;
  avatar?: string;
  planPercent: number;
  createdOrders: number;
}

interface RevenueManagersBlockProps {
  current: number;
  plan: number;
  chartData: ChartDataPoint[];
  status: 'good' | 'warning' | 'critical';
  managers: ManagerShiftData[];
  onManagerClick: (id: string) => void;
  className?: string;
}

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

export const RevenueManagersBlock: React.FC<RevenueManagersBlockProps> = ({
  current,
  plan,
  chartData,
  status,
  managers,
  onManagerClick,
  className = ''
}) => {
  const [isManagersOpen, setIsManagersOpen] = useState(true);
  
  const percentage = Math.round((current / plan) * 100);
  const statusColor = getStatusColor(status);
  
  // Calculate daily plan fallback
  const dailyPlan = chartData.length > 0 ? (chartData[0]?.plan || plan / 30) : plan / 30;
  
  // Transform chartData for IntegratedBarChart
  const integratedData: IntegratedBarChartDataPoint[] = chartData.map(d => ({
    date: d.date,
    value: d.value,
    plan: d.plan || dailyPlan,
    dayOfWeek: d.dayOfWeek,
    isWeekend: d.isWeekend,
    isFuture: d.isFuture
  }));

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden shadow-sm ${className}`}>
      {/* Chart Section */}
      <div className="p-4 pb-3">
        {/* Header with title and values */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground">Выручка СЗ</h3>
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

        {/* Integrated Bar Chart */}
        <IntegratedBarChart
          data={integratedData}
          height={140}
          formatValue={formatBarLabel}
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
              <span className="text-muted-foreground">План тыс.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full border-2 border-muted-foreground/50 bg-background" />
              <span className="text-muted-foreground">Прогноз</span>
            </div>
          </div>
        </div>
      </div>

      {/* Managers Section */}
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
                    <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
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
                          {formatNumber(manager.createdOrders)} ₽
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
