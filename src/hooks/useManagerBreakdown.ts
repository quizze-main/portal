import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export interface ManagerEntry {
  employee_id: string;
  employee_name: string;
  category: string;
  plan: number | null;
  fact: number | null;
  percent: number | null;
  // Derived fields for KPI card parity
  reserve?: number;
  reserveUnit?: string;
  loss?: number;
  forecast?: number;
  forecastValue?: number;
  forecastUnit?: string;
  forecastLabel?: 'forecast' | 'deviation' | 'remaining';
  status?: 'good' | 'warning' | 'critical';
  predictedValue?: number;
  predictedCompletion?: number;
  dailyRate?: number;
}

export interface ManagerBreakdownData {
  byMetric: Record<string, { managers: ManagerEntry[] }>;
  period: string;
  branchId: string;
}

export function useManagerBreakdown(
  branchId: string,
  period: string,
  metricIds: string[],
  enabled: boolean,
) {
  return useQuery<ManagerBreakdownData>({
    queryKey: ['manager-breakdown', branchId, period, metricIds.join(',')],
    queryFn: () => internalApiClient.getManagerBreakdown(branchId, period, metricIds),
    enabled: enabled && !!branchId && branchId !== '__all__' && metricIds.length > 0,
    staleTime: 60_000,
  });
}
