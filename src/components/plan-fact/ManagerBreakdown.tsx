import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/Spinner';
import { internalApiClient, type MetricPlan, type DashboardMetricConfig } from '@/lib/internalApiClient';
import { fmtNum, completionColor, completionTextClass } from '@/lib/planFactUtils';
import { cn } from '@/lib/utils';

interface ManagerBreakdownProps {
  branchId: string;
  metrics: DashboardMetricConfig[];
  plans: MetricPlan[];
  period: string;
}

export function ManagerBreakdown({ branchId, metrics, plans, period }: ManagerBreakdownProps) {
  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['branch-managers', branchId],
    queryFn: async () => {
      const result = await internalApiClient.getEmployeesByStores({ storeIds: [branchId] });
      return result || [];
    },
    staleTime: 60_000,
  });

  // Employee-scope plans for this branch's managers
  const employeePlans = plans.filter(
    p => p.scope === 'employee' && p.period === period,
  );

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  if (managers.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Менеджеры не найдены для данного филиала
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="text-left font-medium text-muted-foreground p-2 min-w-[140px] border-b border-border/50">
              Менеджер
            </th>
            {metrics.map(m => (
              <th key={m.id} className="text-center font-medium text-muted-foreground p-1.5 min-w-[80px] border-b border-border/50">
                <div className="truncate max-w-[90px] mx-auto" title={m.name}>{m.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {managers.map((mgr: any, idx: number) => {
            const employeeId = mgr.name || mgr.employee_id || mgr.id;
            const displayName = mgr.employee_name || mgr.name || 'Без имени';

            return (
              <tr key={employeeId} className={cn('transition-colors hover:bg-muted/30', idx > 0 && 'border-t border-border/30')}>
                <td className="p-2 font-medium">
                  <span className="truncate block max-w-[160px]">{displayName}</span>
                  {mgr.designation && (
                    <span className="text-[10px] text-muted-foreground/60 block">{mgr.designation}</span>
                  )}
                </td>
                {metrics.map(m => {
                  const plan = employeePlans.find(
                    p => p.metricId === m.id && p.scopeId === employeeId,
                  );
                  const planValue = plan?.planValue ?? null;

                  return (
                    <td key={m.id} className="p-1.5 text-center">
                      {planValue != null ? (
                        <div>
                          <div className="text-xs font-medium tabular-nums">{fmtNum(planValue)}</div>
                          <div className="text-[9px] text-muted-foreground/50">план</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
