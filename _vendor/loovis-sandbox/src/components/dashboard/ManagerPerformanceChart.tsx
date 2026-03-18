import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Tooltip,
} from "recharts";

export interface ChartDataPoint {
  date: string;
  dayName: string;
  value: number;
  plan: number;
  monthLabel?: string;
  isMonthStart?: boolean;
}

interface MetricOption {
  id: string;
  name: string;
  unit: string;
  data: ChartDataPoint[];
}

interface ManagerPerformanceChartProps {
  metrics: MetricOption[];
  className?: string;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload, isMobile } = props;
  const isAbovePlan = payload.value >= payload.plan;
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isMobile ? 4 : 5}
      fill={isAbovePlan ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
      stroke="white"
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({ active, payload, metricName, unit }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const value = data.value;
  const plan = data.plan;
  const deviation = plan > 0 ? ((value - plan) / plan * 100) : 0;
  const isPositive = deviation >= 0;

  const formatTooltipValue = (val: number) => {
    if (unit === '₽') {
      return `${formatNumber(val)} ₽`;
    }
    if (unit === '%') {
      return `${val}%`;
    }
    return formatNumber(val);
  };

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-foreground mb-2">
        {data.date}, {data.dayName}
      </div>
      <div className="text-muted-foreground mb-1">
        {metricName}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Факт:</span>
          <span className={cn(
            "font-semibold",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {formatTooltipValue(value)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">План:</span>
          <span className="font-medium">{formatTooltipValue(plan)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border/50">
          <span className="text-muted-foreground">Отклонение:</span>
          <span className={cn(
            "font-semibold",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? '+' : ''}{deviation.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export function ManagerPerformanceChart({ metrics, className }: ManagerPerformanceChartProps) {
  const [selectedMetricId, setSelectedMetricId] = useState(metrics[0]?.id || '');
  const isMobile = useIsMobile();
  
  const selectedMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];
  
  if (!selectedMetric) {
    return null;
  }

  // Calculate adaptive X-axis interval based on data length
  const calculateXAxisInterval = (dataLength: number, mobile: boolean): number => {
    if (dataLength <= 10) return 0;
    if (dataLength <= 20) return mobile ? 2 : 1;
    if (dataLength <= 35) return mobile ? 4 : 2;
    if (dataLength <= 60) return mobile ? 6 : 4;
    return mobile ? 9 : 6;
  };

  const xAxisInterval = calculateXAxisInterval(selectedMetric.data.length, isMobile);

  // Custom tick renderer for X-axis with month labels
  const renderCustomAxisTick = ({ x, y, payload, index }: any) => {
    const point = selectedMetric.data[index];
    const prevPoint = index > 0 ? selectedMetric.data[index - 1] : null;
    
    // Show month: first point OR when month changes
    const isNewMonth = prevPoint && point?.monthLabel !== prevPoint?.monthLabel;
    const showMonth = index === 0 || isNewMonth;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          dy={12} 
          textAnchor="middle" 
          style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        >
          {payload.value}
        </text>
        {showMonth && point?.monthLabel && (
          <text 
            dy={24} 
            textAnchor="middle" 
            style={{ fontSize: 9, fill: 'hsl(var(--warning))', fontWeight: 600 }}
          >
            {point.monthLabel}
          </text>
        )}
      </g>
    );
  };

  // Find month boundary points for annotations (NOT every plan change)
  const planChangePoints = selectedMetric.data.reduce<Array<{index: number; date: string; newPlan: number}>>((acc, point, index) => {
    if (index > 0) {
      const prevPoint = selectedMetric.data[index - 1];
      // Аннотация ТОЛЬКО при смене месяца, НЕ при каждом изменении плана
      const isNewMonth = point.monthLabel !== prevPoint.monthLabel;
      if (isNewMonth) {
        acc.push({ index, date: point.date, newPlan: point.plan });
      }
    }
    return acc;
  }, []);

  // Форматирование значений с учётом единицы измерения
  const formatDisplayValue = (value: number, unit: string): string => {
    if (unit === '₽') {
      return `${formatNumber(value)} ₽`;
    }
    if (unit === '%') {
      return `${value}%`;
    }
    return formatNumber(value);
  };

  // Компактное форматирование для графика
  const formatCompactValue = (value: number, unit: string): string => {
    if (unit === '₽') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1).replace('.', ',')}М`;
      }
      if (value >= 1000) {
        return `${Math.round(value / 1000)}К`;
      }
      return value.toString();
    }
    if (unit === '%') {
      return `${value}%`;
    }
    return value.toString();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Динамика выполнения
        </h3>
        <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border z-50">
            {metrics.map(metric => (
              <SelectItem key={metric.id} value={metric.id} className="text-xs">
                {metric.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart + Table in one row on desktop */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        <div className={cn(
          "flex flex-col lg:flex-row",
          "divide-y lg:divide-y-0 lg:divide-x divide-border/50"
        )}>
          {/* Left: Chart */}
          <div className="flex-[7] p-4">
            <div className={cn(
              isMobile && "overflow-x-auto -mx-4 px-4 pb-2"
            )}>
              <div className={cn(
                "h-[200px] lg:h-[260px]",
                isMobile && selectedMetric.data.length > 10 && "min-w-[780px]"
              )}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedMetric.data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={renderCustomAxisTick}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      interval={0}
                      height={40}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatCompactValue(value, selectedMetric.unit)}
                      domain={['dataMin * 0.9', 'dataMax * 1.1']}
                      width={45}
                    />
                    {/* Month boundary lines with plan change annotation */}
                    {planChangePoints.map((changePoint) => (
                      <ReferenceLine 
                        key={`plan-change-${changePoint.index}`}
                        x={changePoint.date} 
                        stroke="hsl(var(--warning))"
                        strokeDasharray="4 2"
                        strokeWidth={1.5}
                        label={{
                          value: `План: ${formatCompactValue(changePoint.newPlan, selectedMetric.unit)}`,
                          position: 'insideTopRight',
                          fill: 'hsl(var(--warning))',
                          fontSize: 10,
                          fontWeight: 600,
                          offset: 5
                        }}
                      />
                    ))}
                    {/* Dynamic plan line */}
                    <Line
                      type="monotone"
                      dataKey="plan"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                    <Tooltip 
                      content={<CustomTooltip metricName={selectedMetric.name} unit={selectedMetric.unit} />}
                      cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={(props) => <CustomDot {...props} isMobile={isMobile} />}
                      activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mobile scroll hint */}
            {isMobile && selectedMetric.data.length > 10 && (
              <div className="text-[10px] text-muted-foreground text-center mt-1">
                ← Листайте для просмотра →
              </div>
            )}

            {/* Legend */}
            <div className={cn(
              "flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50",
              isMobile && "flex-wrap gap-2"
            )}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-0.5 bg-primary rounded" />
                <span>Факт</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" style={{ borderTop: '2px dashed' }} />
                <span>План</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <span>≥ план</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span>&lt; план</span>
              </div>
            </div>
          </div>

          {/* Right: Data Table */}
          <div className="flex-[3] lg:min-w-[280px] flex flex-col lg:max-h-[340px]">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_60px_70px] gap-0 text-xs font-medium text-muted-foreground border-b border-border/50 bg-secondary/30 sticky top-0">
              <div className="px-3 py-2.5">Дата</div>
              <div className="px-3 py-2.5 text-center">Факт</div>
              <div className="px-3 py-2.5 text-right pr-4">План</div>
            </div>
            {/* Table Body */}
            <div className="flex-1 max-h-[260px] lg:max-h-[300px] overflow-y-auto">
              {selectedMetric.data.map((point, index) => {
                const isAbovePlan = point.value >= point.plan;
                return (
                  <div 
                    key={index}
                    className={cn(
                      "grid grid-cols-[1fr_60px_70px] gap-0 text-xs border-b border-border/30 last:border-0",
                      !isAbovePlan && "bg-destructive/5"
                    )}
                  >
                    <div className="px-3 py-2 text-muted-foreground">
                      {point.date}, {point.dayName}
                    </div>
                    <div className={cn(
                      "px-3 py-2 text-center font-semibold",
                      isAbovePlan ? "text-success" : "text-destructive"
                    )}>
                      {formatCompactValue(point.value, selectedMetric.unit)}
                    </div>
                    <div className="px-3 py-2 pr-4 text-right text-muted-foreground flex items-center justify-end gap-1">
                      {formatCompactValue(point.plan, selectedMetric.unit)}
                      <span className={cn(
                        "text-[10px] shrink-0",
                        isAbovePlan ? "text-success/60" : "text-destructive/60"
                      )}>
                        {isAbovePlan ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
