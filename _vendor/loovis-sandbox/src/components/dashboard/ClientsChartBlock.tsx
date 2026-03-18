import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  value: number;
  revenue?: number;
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
  totalClients: number;
  totalRevenue: number;
  chartData: ChartDataPoint[];
  managers: ClientManagerData[];
  onManagerClick: (id: string) => void;
  className?: string;
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' ₽';
};

const formatShortCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return String(value);
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

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const clients = payload.find(p => p.dataKey === 'value')?.value || 0;
  const revenue = payload.find(p => p.dataKey === 'revenue')?.value || 0;
  const avgCheck = clients > 0 ? Math.round(revenue / clients) : 0;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
      <div className="font-bold text-foreground mb-2 text-sm">{label} декабря</div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Клиентов:</span>
          <span className="font-bold text-foreground">{formatNumber(clients)} чел.</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Выручка:</span>
          <span className="font-bold text-foreground">{formatCurrency(revenue)}</span>
        </div>
        <div className="border-t border-border pt-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ср. чек:</span>
            <span className="font-bold text-primary">{formatCurrency(avgCheck)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom X-axis tick with day of week
interface CustomTickProps {
  x?: number;
  y?: number;
  payload?: { value: string; index?: number };
  chartData?: ChartDataPoint[];
}

const CustomXAxisTick: React.FC<CustomTickProps> = ({ x, y, payload, chartData }) => {
  if (!payload || x === undefined || y === undefined) return null;
  
  const dataPoint = chartData?.find(d => d.date === payload.value);
  const isWeekend = dataPoint?.isWeekend;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        className="text-[9px] md:text-[10px] fill-muted-foreground"
      >
        {payload.value}
      </text>
      {dataPoint?.dayOfWeek && (
        <text
          x={0}
          y={0}
          dy={24}
          textAnchor="middle"
          className={cn(
            "text-[8px] md:text-[9px]",
            isWeekend ? "fill-warning/70" : "fill-muted-foreground/50"
          )}
        >
          {dataPoint.dayOfWeek}
        </text>
      )}
    </g>
  );
};

// Custom label for bars with revenue above and client count below
interface CustomBarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  index?: number;
  chartData: ChartDataPoint[];
}

const CustomBarLabel: React.FC<CustomBarLabelProps> = ({ x, y, width, height, value, index, chartData }) => {
  if (x === undefined || y === undefined || width === undefined || height === undefined || index === undefined) return null;
  
  const dataPoint = chartData[index];
  const revenue = dataPoint?.revenue || 0;
  
  return (
    <g>
      {/* Revenue above the bar (top line) */}
      <text
        x={x + width / 2}
        y={y - 28}
        textAnchor="middle"
        fontSize={9}
        fill="#10b981"
        fontWeight={500}
      >
        {formatShortCurrency(revenue)}
      </text>
      
      {/* Client count inside the bar (top part) */}
      <text
        x={x + width / 2}
        y={y + 12}
        textAnchor="middle"
        fontSize={9}
        fill="hsl(var(--primary-foreground))"
      >
        {value}
      </text>
    </g>
  );
};

export const ClientsChartBlock: React.FC<ClientsChartBlockProps> = ({
  totalClients,
  totalRevenue,
  chartData,
  managers,
  onManagerClick,
  className = ''
}) => {
  const [isManagersOpen, setIsManagersOpen] = useState(true);

  // Calculate average check
  const avgCheck = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  // Normalize revenue data to position line in the upper third of the chart
  const maxClients = Math.max(...chartData.map(d => d.value));
  const maxRevenue = Math.max(...chartData.map(d => d.revenue || 0));
  const minRevenue = Math.min(...chartData.filter(d => d.revenue).map(d => d.revenue || 0));
  
  const normalizedData = chartData.map(d => ({
    ...d,
    revenueNormalized: d.revenue 
      ? ((d.revenue - minRevenue) / (maxRevenue - minRevenue || 1)) * (maxClients * 0.3) + (maxClients * 0.7)
      : maxClients * 0.7
  }));

  return (
    <div className={`bg-card rounded-2xl border border-border overflow-hidden shadow-sm ${className}`}>
      <div className="p-4 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Количество ФЛ</h3>
          </div>
          <div className="flex items-baseline gap-1.5 flex-shrink-0">
            <span className="text-lg font-bold text-foreground">
              {formatNumber(totalClients)} чел.
            </span>
            <span className="text-muted-foreground mx-1">|</span>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-muted-foreground mb-4">
          Трафик и выручка за период • Ср. чек: <span className="font-medium text-foreground">{formatCurrency(avgCheck)}</span>
        </p>

        {/* Chart */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="min-w-[780px] md:min-w-0">
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={normalizedData} margin={{ top: 35, right: 10, left: -15, bottom: 45 }}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={<CustomXAxisTick chartData={chartData} />}
                  interval={0}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => String(value)}
                  domain={[0, (dataMax: number) => dataMax * 1.3]}
                  hide
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--border))" />
                
                {/* Bars for clients count */}
                <Bar 
                  yAxisId="left"
                  dataKey="value" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  label={<CustomBarLabel chartData={chartData} />}
                />
                
                {/* Line for revenue (normalized to upper third) */}
                <Line 
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenueNormalized" 
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mobile hint */}
        <p className="text-[10px] text-muted-foreground text-center mt-2 md:hidden">
          Нажмите на столбец для деталей
        </p>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-muted-foreground">Кол-во ФЛ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-emerald-500 rounded-full" />
            <span className="text-muted-foreground">Выручка</span>
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
