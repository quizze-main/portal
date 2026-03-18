import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchMetricDailyGraph } from '@/lib/leaderDashboardApi';
import { transformDailyGraphData } from './useMetricDailyGraph';
import type { IntegratedBarChartDataPoint } from '@/components/dashboard/IntegratedBarChart';
import type { ChartMetricSeries } from '@/lib/internalApiClient';

export interface MultiMetricData {
  /** Chart data per metric code */
  seriesData: Record<string, IntegratedBarChartDataPoint[]>;
  /** Union of all dates across all series (sorted) */
  dates: string[];
  /** Whether any series is still loading */
  isLoading: boolean;
  /** First error encountered (if any) */
  error: Error | null;
}

interface UseMultiMetricDailyGraphParams {
  metricSeries: ChartMetricSeries[];
  dateFrom?: string;
  dateTo?: string;
  subjectType: 'manager' | 'store';
  subjectIds: string[];
  isAggregated?: boolean;
  enabled?: boolean;
}

export function useMultiMetricDailyGraph({
  metricSeries,
  dateFrom,
  dateTo,
  subjectType,
  subjectIds,
  isAggregated = false,
  enabled = true,
}: UseMultiMetricDailyGraphParams): MultiMetricData {
  const sortedIdsKey = subjectIds.slice().sort().join(',');
  const sortedIds = useMemo(() => subjectIds.slice().sort(), [sortedIdsKey]);

  const canFetch = enabled && !!dateFrom && !!dateTo && sortedIds.length > 0;

  // Fire parallel queries — one per metric series
  const queries = useQueries({
    queries: metricSeries.map(series => ({
      queryKey: ['metric-daily-graph', series.metricCode, dateFrom, dateTo, subjectType, sortedIdsKey, isAggregated],
      queryFn: () => fetchMetricDailyGraph({
        metricName: series.metricCode,
        dateFrom: dateFrom!,
        dateTo: dateTo!,
        subjectType,
        subjectIds: sortedIds,
        isAggregated,
      }),
      enabled: canFetch && !!series.metricCode,
      staleTime: 5 * 60 * 1000,
      retry: (failureCount: number, err: unknown) => {
        const status = (err as { status?: number }).status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    })),
  });

  const seriesData = useMemo(() => {
    const result: Record<string, IntegratedBarChartDataPoint[]> = {};
    metricSeries.forEach((series, idx) => {
      const query = queries[idx];
      if (query?.data) {
        result[series.metricCode] = transformDailyGraphData(
          query.data, sortedIds, isAggregated, dateFrom, dateTo
        );
      } else {
        result[series.metricCode] = [];
      }
    });
    return result;
  }, [queries.map(q => q.data), metricSeries, sortedIds, isAggregated, dateFrom, dateTo]);

  // Collect all unique dates across all series
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const points of Object.values(seriesData)) {
      for (const p of points) {
        if (p.fullDate) dateSet.add(p.fullDate);
      }
    }
    return [...dateSet].sort();
  }, [seriesData]);

  const isLoading = canFetch && queries.some(q => q.isLoading);
  const error = queries.find(q => q.error)?.error as Error | null;

  return { seriesData, dates, isLoading, error };
}
