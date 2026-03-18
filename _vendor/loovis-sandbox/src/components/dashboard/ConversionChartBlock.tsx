import { cn, getManagerAvatar } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { FilterPeriod } from './FilterBar';
import { 
  conversionChartDataByPeriod, 
  conversionManagersDataByPeriod,
  type ConversionChartDataPoint,
  type ConversionManagerRow,
} from '@/data/conversionData';

interface ConversionChartBlockProps {
  period: FilterPeriod;
  onManagerClick?: (managerId: string) => void;
  className?: string;
}

const COLORS = {
  flSale: '#22C55E',     // green
  repairCheck: '#3B82F6', // blue
  repairSale: '#8B5CF6',  // violet
  flCheck: '#F59E0B',     // amber
  checkSale: '#EF4444',   // red
};

const LABELS = {
  flSale: 'ФЛ → Продажа',
  repairCheck: 'Ремонт → Проверка',
  repairSale: 'Ремонт → Продажа',
  flCheck: 'ФЛ → Проверка',
  checkSale: 'Проверка → Продажа',
};

const getStatusColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.filter((p: any) => !p.dataKey.includes('Plan')).map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {LABELS[item.dataKey as keyof typeof LABELS]}
              </span>
            </div>
            <span className="font-medium text-foreground">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ConversionChartBlock({ period, onManagerClick, className }: ConversionChartBlockProps) {
  const chartData = conversionChartDataByPeriod[period] || conversionChartDataByPeriod['month'];
  const managers = conversionManagersDataByPeriod[period] || conversionManagersDataByPeriod['month'];
  
  // Sort managers by overall percent descending
  const sortedManagers = [...managers].sort((a, b) => b.overallPercent - a.overallPercent);
  
  return (
    <Card className={cn("border-0 shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b border-border/30">
        <h4 className="text-sm font-semibold text-foreground">Динамика конверсий</h4>
      </div>
      
      <div className="flex flex-col lg:flex-row">
        {/* Chart */}
        <div className="flex-1 p-4">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Line 
                  type="monotone" 
                  dataKey="flSale" 
                  stroke={COLORS.flSale} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="repairCheck" 
                  stroke={COLORS.repairCheck} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="repairSale" 
                  stroke={COLORS.repairSale} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="flCheck" 
                  stroke={COLORS.flCheck} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="checkSale" 
                  stroke={COLORS.checkSale} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
            {Object.entries(LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div 
                  className="w-2.5 h-0.5 rounded-full" 
                  style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Managers sidebar */}
        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/20">
          <div className="px-4 py-2 border-b border-border/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Топ менеджеров
            </span>
          </div>
          <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto">
            {sortedManagers.slice(0, 5).map((manager, index) => (
              <button
                key={manager.id}
                onClick={() => onManagerClick?.(manager.id)}
                className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted/50 transition-colors group"
              >
                <span className="text-xs font-medium text-muted-foreground w-4">
                  {index + 1}
                </span>
                <Avatar className="w-6 h-6">
                  <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(manager.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {manager.name}
                  </p>
                </div>
                <span className={cn("text-sm font-bold", getStatusColor(manager.overallPercent))}>
                  {manager.overallPercent}%
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
