import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { internalApiClient, Employee } from '@/lib/internalApiClient';
import { useAdminDashboardMetrics } from './useAdminDashboardMetrics';
import { useManagerBreakdown } from './useManagerBreakdown';
import { getDashboardPositionCategory } from '@/lib/roleUtils';

export interface ManagerMetricItem {
  id: string;
  name: string;
  unit: string;
  fact: number | null;
  plan: number | null;
  percent: number | null;
  color: string;
  forecastLabel: 'forecast' | 'deviation' | 'remaining';
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface UseManagerDetailResult {
  employee: Employee | null;
  employees: Employee[];
  metrics: ManagerMetricItem[];
  loading: boolean;
  error: string | null;
}

function getMetricStatus(percent: number | null): 'good' | 'warning' | 'critical' | 'neutral' {
  if (percent == null) return 'neutral';
  if (percent >= 100) return 'good';
  if (percent >= 80) return 'warning';
  return 'critical';
}

export function useManagerDetail(
  managerId: string | undefined,
  storeIds: string[],
  period: string, // YYYY-MM
): UseManagerDetailResult {
  const storeIdsKey = [...storeIds].sort().join(',');

  // 1. Fetch employees for the store(s) — provides list for switcher + current employee info
  const employeesQuery = useQuery({
    queryKey: ['manager-detail-employees', storeIdsKey],
    queryFn: () => internalApiClient.getEmployeesByStores({ storeIds }),
    enabled: storeIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const allEmployees = employeesQuery.data || [];
  const currentEmployee = managerId ? allEmployees.find(e => e.name === managerId) : null;
  const positionCategory = getDashboardPositionCategory(currentEmployee?.designation);

  // 2. Get metric configs — filter by enabled + visibleToPositions
  const { metrics: allMetricConfigs, isLoading: metricsConfigLoading, error: metricsConfigError } = useAdminDashboardMetrics();

  const filteredMetrics = useMemo(() => {
    return allMetricConfigs
      .filter(m => m.enabled)
      .filter(m => {
        const vtp = m.visibleToPositions || [];
        if (vtp.length === 0) return true;
        return vtp.includes(positionCategory);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [allMetricConfigs, positionCategory]);

  const filteredMetricIds = useMemo(() => filteredMetrics.map(m => m.id), [filteredMetrics]);

  // Use first store as branchId for breakdown (breakdown works with single branch)
  const branchId = storeIds[0] || '';

  // 3. Fetch breakdown data (fact/plan/percent per manager per metric)
  const breakdownQuery = useManagerBreakdown(
    branchId,
    period,
    filteredMetricIds,
    !!managerId && storeIds.length > 0 && filteredMetricIds.length > 0,
  );

  // 4. Build metrics for current manager
  const metrics: ManagerMetricItem[] = useMemo(() => {
    if (!breakdownQuery.data || !managerId) return [];

    const { byMetric } = breakdownQuery.data;

    return filteredMetrics
      .map(metricConfig => {
        const metricData = byMetric[metricConfig.id];
        if (!metricData) return null;

        const managerEntry = metricData.managers.find(m => m.employee_id === managerId);

        return {
          id: metricConfig.id,
          name: metricConfig.name,
          unit: metricConfig.unit || '',
          fact: managerEntry?.fact ?? null,
          plan: managerEntry?.plan ?? null,
          percent: managerEntry?.percent ?? null,
          color: metricConfig.color || '#3B82F6',
          forecastLabel: metricConfig.forecastLabel || 'forecast',
          status: getMetricStatus(managerEntry?.percent ?? null),
        } satisfies ManagerMetricItem;
      })
      .filter((m): m is ManagerMetricItem => m !== null);
  }, [breakdownQuery.data, managerId, filteredMetrics]);

  const loading = employeesQuery.isLoading || metricsConfigLoading || breakdownQuery.isLoading;
  const error = employeesQuery.error?.message || (metricsConfigError as Error)?.message || breakdownQuery.error?.message || null;

  return {
    employee: currentEmployee || null,
    employees: allEmployees,
    metrics,
    loading,
    error,
  };
}
