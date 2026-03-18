import { useState, useRef, TouchEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  date: string;
  value: number;
  plan?: number;
}

export interface MetricChartData {
  id: string;
  name: string;
  unit: string;
  data: ChartDataPoint[];
  plan: number;
  current: number;
  forecast: number;
  status: 'good' | 'warning' | 'critical';
}

interface DynamicsChartProps {
  metrics: MetricChartData[];
  className?: string;
}

const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'good': return 'hsl(var(--kpi-good))';
    case 'warning': return 'hsl(var(--kpi-warning))';
    case 'critical': return 'hsl(var(--kpi-critical))';
  }
};

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  }
  return `${value}${unit}`;
};

export function DynamicsChart({ metrics, className }: DynamicsChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const activeMetric = metrics[activeIndex];

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && activeIndex < metrics.length - 1) {
        setActiveIndex(activeIndex + 1);
      } else if (diff < 0 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      }
    }
  };

  const goToPrev = () => {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const goToNext = () => {
    if (activeIndex < metrics.length - 1) setActiveIndex(activeIndex + 1);
  };

  if (!activeMetric) return null;

  const statusColor = getStatusColor(activeMetric.status);
  const maxValue = Math.max(...activeMetric.data.map(d => d.value), activeMetric.plan) * 1.1;

  return (
    <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrev}
          disabled={activeIndex === 0}
          className="p-1 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <div className="text-center flex-1">
          <h3 className="font-semibold text-foreground">{activeMetric.name}</h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span 
              className="text-2xl font-bold"
              style={{ color: statusColor }}
            >
              {formatValue(activeMetric.current, activeMetric.unit)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatValue(activeMetric.plan, activeMetric.unit)}
            </span>
          </div>
        </div>

        <button
          onClick={goToNext}
          disabled={activeIndex === metrics.length - 1}
          className="p-1 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Chart */}
      <div 
        className="h-40"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={activeMetric.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${activeMetric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickMargin={8}
            />
            <YAxis 
              hide
              domain={[0, maxValue]}
            />
            
            {/* Plan reference line */}
            <ReferenceLine 
              y={activeMetric.plan} 
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            
            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill={`url(#gradient-${activeMetric.id})`}
            />
            
            {/* Main line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={statusColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: statusColor }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {metrics.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === activeIndex 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div 
            className="w-3 h-0.5 rounded"
            style={{ backgroundColor: statusColor }}
          />
          <span>Факт</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-muted-foreground/50" style={{ 
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--muted-foreground) / 0.5) 2px, hsl(var(--muted-foreground) / 0.5) 4px)'
          }} />
          <span>План</span>
        </div>
      </div>
    </div>
  );
}
