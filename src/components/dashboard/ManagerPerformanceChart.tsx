import { memo, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";

export interface ChartDataPoint {
  date: string;
  dayName: string;
  value: number;
  plan: number;
  monthLabel?: string;
}

interface MetricOption {
  id: string;
  name: string;
  unit: string;
  data: ChartDataPoint[];
}

interface ManagerPerformanceChartProps {
  metrics: MetricOption[];
  slots?: number;
  className?: string;
}

const xAxisInterval = (dataLength: number, mobile: boolean): number => {
  if (dataLength <= 10) return 0;
  if (dataLength <= 20) return mobile ? 2 : 1;
  if (dataLength <= 35) return mobile ? 4 : 2;
  if (dataLength <= 60) return mobile ? 6 : 4;
  return mobile ? 9 : 6;
};

const makeFormatCompact = (unit: string) => (value: number): string => {
  if (unit === '₽') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}М`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}К`;
    return value.toString();
  }
  if (unit === '%') return `${value}%`;
  return formatNumber(value);
};

const CustomTooltip = ({ active, payload, metricName, unit }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const deviation = data.plan > 0 ? ((data.value - data.plan) / data.plan * 100) : 0;
  const isPositive = deviation >= 0;
  const fmt = makeFormatCompact(unit);

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-foreground mb-1">{data.date}, {data.dayName}</div>
      <div className="text-muted-foreground mb-1.5">{metricName}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Факт:</span>
          <span className={cn("font-semibold", isPositive ? "text-success" : "text-destructive")}>
            {fmt(data.value)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">План:</span>
          <span className="font-medium">{fmt(data.plan)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border/50">
          <span className="text-muted-foreground">Отклонение:</span>
          <span className={cn("font-semibold", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? '+' : ''}{deviation.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload, isMobile } = props;
  const isAbovePlan = payload.value >= payload.plan;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isMobile ? 3 : 4}
      fill={isAbovePlan ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
      stroke="white"
      strokeWidth={2}
    />
  );
};

interface SingleChartProps {
  metric: MetricOption;
  allMetrics: MetricOption[];
  onMetricChange: (id: string) => void;
  isMobile: boolean;
}

const SingleChart = memo(({ metric, allMetrics, onMetricChange, isMobile }: SingleChartProps) => {
  const [open, setOpen] = useState(false);

  const formatCompact = useMemo(() => makeFormatCompact(metric.unit), [metric.unit]);

  const planChangePoints = useMemo(() =>
    metric.data.reduce<Array<{ date: string; newPlan: number }>>((acc, point, i) => {
      if (i > 0 && point.monthLabel !== metric.data[i - 1].monthLabel) {
        acc.push({ date: point.date, newPlan: point.plan });
      }
      return acc;
    }, []),
    [metric.data]
  );

  const interval = useMemo(
    () => xAxisInterval(metric.data.length, isMobile),
    [metric.data.length, isMobile]
  );

  const renderTick = useCallback(({ x, y, payload, index }: any) => {
    const point = metric.data[index];
    const prev = index > 0 ? metric.data[index - 1] : null;
    const showMonth = index === 0 || (prev && point?.monthLabel !== prev?.monthLabel);
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={12} textAnchor="middle" style={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}>
          {payload.value}
        </text>
        {showMonth && point?.monthLabel && (
          <text dy={23} textAnchor="middle" style={{ fontSize: 8, fill: 'hsl(var(--warning))', fontWeight: 600 }}>
            {point.monthLabel}
          </text>
        )}
      </g>
    );
  }, [metric.data]);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary rounded-full px-2 py-1 hover:bg-muted/60 transition-colors"
            >
              <span>{metric.name}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform", open && "rotate-180")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 p-1.5">
            {allMetrics.map((m) => (
              <button
                key={m.id}
                type="button"
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted/60 text-left"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onMetricChange(m.id);
                  setOpen(false);
                }}
              >
                <Check className={cn("w-3.5 h-3.5 flex-shrink-0", m.id === metric.id ? "text-primary" : "opacity-0")} />
                <span className={cn("text-foreground", m.id === metric.id && "font-medium")}>{m.name}</span>
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[11px] text-muted-foreground tabular-nums">
          {metric.unit || ''}
        </span>
      </div>

      {/* Chart + Table */}
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border/50">
        {/* Chart */}
        <div className="flex-[7] p-3">
          <div className={cn(isMobile && "overflow-x-auto -mx-3 px-3 pb-1")}>
            <div className={cn("h-[160px] lg:h-[200px]", isMobile && metric.data.length > 10 && "min-w-[600px]")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metric.data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={renderTick}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    interval={interval}
                    height={36}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompact}
                    domain={['dataMin * 0.9', 'dataMax * 1.1']}
                    width={40}
                  />
                  {planChangePoints.map((cp) => (
                    <ReferenceLine
                      key={cp.date}
                      x={cp.date}
                      stroke="hsl(var(--warning))"
                      strokeDasharray="4 2"
                      strokeWidth={1.5}
                      label={{
                        value: formatCompact(cp.newPlan),
                        position: 'insideTopRight',
                        fill: 'hsl(var(--warning))',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    />
                  ))}
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
                    content={<CustomTooltip metricName={metric.name} unit={metric.unit} />}
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={(props) => <CustomDot {...props} isMobile={isMobile} />}
                    activeDot={{ r: 5, stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {isMobile && metric.data.length > 10 && (
            <div className="text-[9px] text-muted-foreground text-center mt-1">← Листайте →</div>
          )}
        </div>

        {/* Data Table */}
        <div className="flex-[3] lg:min-w-[220px] flex flex-col lg:max-h-[260px]">
          <div className="grid grid-cols-[1fr_56px_64px] text-[10px] font-medium text-muted-foreground border-b border-border/50 bg-secondary/30 sticky top-0">
            <div className="px-3 py-2">Дата</div>
            <div className="px-2 py-2 text-center">Факт</div>
            <div className="px-2 py-2 text-right pr-3">План</div>
          </div>
          <div className="flex-1 max-h-[200px] lg:max-h-[220px] overflow-y-auto">
            {metric.data.map((point, i) => {
              const isAbove = point.value >= point.plan;
              return (
                <div
                  key={i}
                  className={cn(
                    "grid grid-cols-[1fr_56px_64px] text-[10px] border-b border-border/30 last:border-0",
                    !isAbove && "bg-destructive/5"
                  )}
                >
                  <div className="px-3 py-1.5 text-muted-foreground truncate">{point.date}, {point.dayName}</div>
                  <div className={cn("px-2 py-1.5 text-center font-semibold", isAbove ? "text-success" : "text-destructive")}>
                    {formatCompact(point.value)}
                  </div>
                  <div className="px-2 py-1.5 pr-3 text-right text-muted-foreground flex items-center justify-end gap-0.5">
                    {formatCompact(point.plan)}
                    <span className={cn("text-[9px]", isAbove ? "text-success/60" : "text-destructive/60")}>
                      {isAbove ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

SingleChart.displayName = "SingleChart";

export function ManagerPerformanceChart({ metrics, slots = 3, className }: ManagerPerformanceChartProps) {
  const isMobile = useIsMobile();
  const slotCount = Math.min(slots, metrics.length);

  const [slotIds, setSlotIds] = useState<string[]>(() =>
    metrics.slice(0, slotCount).map((m) => m.id)
  );

  const handleChange = useCallback((slotIndex: number, metricId: string) => {
    setSlotIds((prev) => prev.map((id, i) => (i === slotIndex ? metricId : id)));
  }, []);

  if (!metrics.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Динамика выполнения
        </h3>
        {/* Shared legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span>Факт</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-3 h-0.5 bg-muted-foreground rounded" style={{ borderTop: '2px dashed' }} />
            <span>План</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>≥ план</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span>&lt; план</span>
          </div>
        </div>
      </div>

      {slotIds.map((id, slotIndex) => {
        const metric = metrics.find((m) => m.id === id) ?? metrics[slotIndex];
        if (!metric) return null;
        return (
          <SingleChart
            key={slotIndex}
            metric={metric}
            allMetrics={metrics}
            onMetricChange={(newId) => handleChange(slotIndex, newId)}
            isMobile={isMobile}
          />
        );
      })}
    </div>
  );
}
