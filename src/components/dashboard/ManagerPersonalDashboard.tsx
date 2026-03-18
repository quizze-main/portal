import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { useManagerDetail, ManagerMetricItem } from '@/hooks/useManagerDetail';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { DailyFactCards } from '@/components/leader-dashboard/DailyFactCards';
import { FactStatusCard } from '@/components/dashboard/FactStatusCard';
import { Spinner } from '@/components/Spinner';
import { cn } from '@/lib/utils';
import { getCurrentPeriod, formatPeriodLabel, shiftPeriod } from '@/lib/periodUtils';

function formatMetricValue(value: number | null, unit: string): string {
  if (value == null) return '-';
  if (unit === '%') return `${Math.round(value * 10) / 10}%`;
  if (value >= 1000) return Math.round(value).toLocaleString('ru-RU');
  return String(Math.round(value * 100) / 100);
}

function MetricRow({ metric }: { metric: ManagerMetricItem }) {
  const percent = metric.percent ?? 0;
  const barWidth = Math.min(percent, 120);

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{metric.name}</span>
        <span className={cn(
          'text-sm font-semibold',
          metric.status === 'good' && 'text-green-600 dark:text-green-400',
          metric.status === 'warning' && 'text-yellow-600 dark:text-yellow-400',
          metric.status === 'critical' && 'text-red-600 dark:text-red-400',
          metric.status === 'neutral' && 'text-muted-foreground',
        )}>
          {metric.percent != null ? `${Math.round(metric.percent)}%` : '-'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        <span>Факт: {formatMetricValue(metric.fact, metric.unit)}</span>
        <span>/</span>
        <span>План: {formatMetricValue(metric.plan, metric.unit)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            metric.status === 'good' && 'bg-green-500',
            metric.status === 'warning' && 'bg-yellow-500',
            metric.status === 'critical' && 'bg-red-500',
            metric.status === 'neutral' && 'bg-muted-foreground',
          )}
          style={{ width: `${Math.max(barWidth, 0)}%` }}
        />
      </div>
    </div>
  );
}

export function ManagerPersonalDashboard() {
  const { employee, storeOptions, storeId } = useEmployee();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [factSheetOpen, setFactSheetOpen] = useState(false);
  const { metrics: allMetricConfigs } = useAdminDashboardMetrics();

  const storeIds = useMemo(() => {
    if (storeId) return [String(storeId)];
    return storeOptions.map(s => s.store_id);
  }, [storeId, storeOptions]);

  const defaultBranchId = String(storeId || storeOptions[0]?.store_id || '');
  const managerId = employee?.name;

  const { metrics, loading, error } = useManagerDetail(managerId, storeIds, period);

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[20px] font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <BarChart3 size={20} className="text-blue-500" />
          Мои показатели
        </CardTitle>
        {/* Period Selector */}
        <div className="flex items-center gap-1 mt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPeriod(p => shiftPeriod(p, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground min-w-[110px] text-center">
            {formatPeriodLabel(period)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPeriod(p => shiftPeriod(p, 1))}
            disabled={period >= getCurrentPeriod()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Fact Status */}
        <div className="mt-2">
          <FactStatusCard
            storeId={defaultBranchId}
            metrics={allMetricConfigs}
            onOpen={() => setFactSheetOpen(true)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-red-500 py-4">{error}</p>
        )}

        {!loading && !error && metrics.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Нет показателей за {formatPeriodLabel(period)}
          </p>
        )}

        {!loading && metrics.length > 0 && (
          <div className="divide-y divide-border">
            {metrics.map(metric => (
              <MetricRow key={metric.id} metric={metric} />
            ))}
          </div>
        )}
      </CardContent>

      {/* Fact Entry Sheet */}
      <Sheet open={factSheetOpen} onOpenChange={(open) => {
        setFactSheetOpen(open);
        if (!open) queryClient.invalidateQueries({ queryKey: ['fact-history'] });
      }}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-base">Заполнить факт</SheetTitle>
          </SheetHeader>
          {factSheetOpen && (
            <DailyFactCards
              metrics={allMetricConfigs}
              branches={storeOptions}
              defaultBranchId={defaultBranchId}
              onClose={() => setFactSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
