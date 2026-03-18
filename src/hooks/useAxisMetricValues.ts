import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export interface AxisMetricValue {
  fact: number;
  plan: number;
  percent: number;
}

/**
 * Загружает fact/plan/percent для метрик, привязанных к осям матрицы.
 * Столбцы (manager) → scope=employee (личные данные)
 * Строки (club) → scope=branch (данные филиала)
 */
export function useAxisMetricValues(
  managerLinkedMetricId?: string | null,
  clubLinkedMetricId?: string | null,
  trackerStoreId?: string,
) {
  // Личная метрика (столбцы) — scope=employee, storeId не нужен
  const managerQuery = useQuery({
    queryKey: ['axis-metric-values', 'employee', managerLinkedMetricId],
    queryFn: () => internalApiClient.getMotivationMetricValues(
      [managerLinkedMetricId!],
      trackerStoreId || '',
      'employee',
    ),
    enabled: Boolean(managerLinkedMetricId),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  // Метрика филиала (строки) — scope=branch, нужен storeId
  const clubQuery = useQuery({
    queryKey: ['axis-metric-values', 'branch', clubLinkedMetricId, trackerStoreId],
    queryFn: () => internalApiClient.getMotivationMetricValues(
      [clubLinkedMetricId!],
      trackerStoreId!,
      'branch',
    ),
    enabled: Boolean(clubLinkedMetricId) && Boolean(trackerStoreId),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const managerMetric = managerLinkedMetricId && managerQuery.data
    ? managerQuery.data[managerLinkedMetricId] ?? null
    : null;

  const clubMetric = clubLinkedMetricId && clubQuery.data
    ? clubQuery.data[clubLinkedMetricId] ?? null
    : null;

  const refetch = () => {
    const promises: Promise<any>[] = [];
    if (managerLinkedMetricId) promises.push(managerQuery.refetch());
    if (clubLinkedMetricId && trackerStoreId) promises.push(clubQuery.refetch());
    return Promise.all(promises);
  };

  return {
    managerMetric,
    clubMetric,
    isLoading: (managerQuery.isLoading && Boolean(managerLinkedMetricId))
      || (clubQuery.isLoading && Boolean(clubLinkedMetricId) && Boolean(trackerStoreId)),
    refetch,
    isRefetching: managerQuery.isRefetching || clubQuery.isRefetching,
  };
}
