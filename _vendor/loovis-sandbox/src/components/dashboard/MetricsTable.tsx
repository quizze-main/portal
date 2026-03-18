import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricRow {
  id: string;
  name: string;
  current: number;
  plan: number;
  percent: number;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface ManagerMetrics {
  managerId: string;
  managerName: string;
  metrics: MetricRow[];
}

interface MetricsTableProps {
  data: ManagerMetrics[];
  clubTotals?: MetricRow[];
  onManagerClick?: (managerId: string) => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'М';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'К';
  }
  return num.toString();
};

const TrendIcon = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) => {
  const icons = {
    up: <TrendingUp className="w-3 h-3 text-kpi-good" />,
    down: <TrendingDown className="w-3 h-3 text-kpi-critical" />,
    stable: <Minus className="w-3 h-3 text-muted-foreground" />
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      {icons[trend]}
      {value !== undefined && (
        <span className={cn(
          "text-xs",
          trend === 'up' && "text-kpi-good",
          trend === 'down' && "text-kpi-critical",
          trend === 'stable' && "text-muted-foreground"
        )}>
          {value}%
        </span>
      )}
    </span>
  );
};

const getPercentColor = (percent: number): string => {
  if (percent >= 90) return 'text-kpi-good';
  if (percent >= 70) return 'text-kpi-warning';
  return 'text-kpi-critical';
};

export function MetricsTable({ data, clubTotals, onManagerClick }: MetricsTableProps) {
  // Get unique metric names from first manager's data
  const metricNames = data[0]?.metrics.map(m => m.name) || [];

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[140px] text-xs font-medium sticky left-0 bg-card z-10">
                Менеджер
              </TableHead>
              {metricNames.map((name) => (
                <TableHead key={name} className="text-xs font-medium text-center min-w-[80px]">
                  {name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Club totals row */}
            {clubTotals && (
              <TableRow className="bg-primary/5 border-border/50">
                <TableCell className="font-medium text-xs sticky left-0 bg-primary/5 z-10">
                  По клубу
                </TableCell>
                {clubTotals.map((metric) => (
                  <TableCell key={metric.id} className="text-center p-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn("text-sm font-semibold", getPercentColor(metric.percent))}>
                        {metric.percent}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatNumber(metric.current)}/{formatNumber(metric.plan)}
                      </span>
                      <TrendIcon trend={metric.trend} value={metric.trendValue} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            )}
            
            {/* Manager rows */}
            {data.map((manager) => (
              <TableRow 
                key={manager.managerId} 
                className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onManagerClick?.(manager.managerId)}
              >
                <TableCell className="font-medium text-xs sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-medium text-primary">
                        {manager.managerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <span className="truncate max-w-[100px]">{manager.managerName}</span>
                  </div>
                </TableCell>
                {manager.metrics.map((metric) => (
                  <TableCell key={metric.id} className="text-center p-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn("text-sm font-semibold", getPercentColor(metric.percent))}>
                        {metric.percent}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatNumber(metric.current)}
                      </span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
