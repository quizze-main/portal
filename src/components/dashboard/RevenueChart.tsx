import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  date: string;
  value: number;
  plan?: number;
}

interface RevenueChartProps {
  current: number;
  plan: number;
  data: ChartDataPoint[];
  status: 'good' | 'warning' | 'critical';
  className?: string;
}

const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'good': return 'hsl(var(--success))';
    case 'warning': return 'hsl(var(--warning))';
    case 'critical': return 'hsl(var(--destructive))';
  }
};

const formatValue = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ₽`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K ₽`;
  return `${value} ₽`;
};

export function RevenueChart({ current, plan, data, status, className }: RevenueChartProps) {
  const statusColor = getStatusColor(status);
  const maxValue = Math.max(...data.map(d => d.value), plan) * 1.1;
  const percent = Math.round((current / plan) * 100);

  return (
    <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Выручка СЗ (клуб)</h3>
        <div className="flex items-baseline gap-2">
          <span 
            className="text-2xl font-bold"
            style={{ color: statusColor }}
          >
            {formatValue(current)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatValue(plan)}
          </span>
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            status === 'good' && 'bg-success/10 text-success',
            status === 'warning' && 'bg-warning/10 text-warning',
            status === 'critical' && 'bg-destructive/10 text-destructive'
          )}>
            {percent}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
              y={plan} 
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            
            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#revenueGradient)"
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
          <div className="w-3 h-0.5 rounded bg-muted-foreground/30" style={{ 
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--muted-foreground) / 0.3) 2px, hsl(var(--muted-foreground) / 0.3) 4px)'
          }} />
          <span>План</span>
        </div>
      </div>
    </div>
  );
}