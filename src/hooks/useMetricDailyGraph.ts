import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchMetricDailyGraph } from '@/lib/leaderDashboardApi';
import type { DailyPlanGraphResponse } from '@/lib/leaderDashboardApi';
import type { IntegratedBarChartDataPoint } from '@/components/dashboard/IntegratedBarChart';

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Трансформирует ответ daily_plan_graph API в IntegratedBarChartDataPoint[].
 *
 * Aggregated → data.aggregated
 * Non-aggregated single subject → data[subjectId]
 */
export function transformDailyGraphData(
  response: DailyPlanGraphResponse,
  subjectIds: string[],
  isAggregated: boolean,
  dateFrom?: string,
  dateTo?: string,
): IntegratedBarChartDataPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dailyMap: Record<string, { fact_value: number; plan_value: number }> | undefined;

  if (isAggregated) {
    dailyMap = response.data?.aggregated;
  } else if (subjectIds.length === 1) {
    // Non-aggregated — берём первый (единственный) ключ кроме 'aggregated'.
    // API может вернуть ключ в формате "itigris-XXX" вместо отправленного ID.
    const dataKeys = Object.keys(response.data ?? {}).filter(k => k !== 'aggregated');
    const key = dataKeys.find(k => k === subjectIds[0]) ?? dataKeys[0];
    dailyMap = key ? (response.data[key] as Record<string, { fact_value: number; plan_value: number }>) : undefined;
  } else {
    // Мульти-субъект без агрегации — суммируем вручную (fallback)
    const merged: Record<string, { fact_value: number; plan_value: number }> = {};
    for (const [key, dayData] of Object.entries(response.data ?? {})) {
      if (key === 'aggregated') continue;
      for (const [dateStr, values] of Object.entries(dayData as Record<string, { fact_value: number; plan_value: number }>)) {
        if (!merged[dateStr]) merged[dateStr] = { fact_value: 0, plan_value: 0 };
        merged[dateStr].fact_value += Number(values.fact_value) || 0;
        merged[dateStr].plan_value += Number(values.plan_value) || 0;
      }
    }
    dailyMap = merged;
  }

  if (!dailyMap) return [];

  const sortedDates = Object.keys(dailyMap)
    .filter(dateStr => {
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo && dateStr > dateTo) return false;
      return true;
    })
    .sort();

  return sortedDates.map(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const entry = dailyMap![dateStr];
    const isFuture = d > today;

    return {
      date: String(d.getDate()),
      fullDate: dateStr,
      value: isFuture ? 0 : (Number(entry.fact_value) || 0),
      plan: Number(entry.plan_value) || 0,
      dayOfWeek: DAY_NAMES[d.getDay()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isFuture,
    };
  });
}

interface UseMetricDailyGraphParams {
  metricName: string;
  dateFrom?: string;
  dateTo?: string;
  subjectType: 'manager' | 'store';
  subjectIds: string[];
  isAggregated?: boolean;
  enabled?: boolean;
}

export function useMetricDailyGraph({
  metricName,
  dateFrom,
  dateTo,
  subjectType,
  subjectIds,
  isAggregated = false,
  enabled = true,
}: UseMetricDailyGraphParams) {
  const sortedIdsKey = subjectIds.slice().sort().join(',');
  const sortedIds = useMemo(() => subjectIds.slice().sort(), [sortedIdsKey]);

  const canFetch = enabled && !!metricName && !!dateFrom && !!dateTo && sortedIds.length > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['metric-daily-graph', metricName, dateFrom, dateTo, subjectType, sortedIdsKey, isAggregated],
    queryFn: () => fetchMetricDailyGraph({
      metricName,
      dateFrom: dateFrom!,
      dateTo: dateTo!,
      subjectType,
      subjectIds: sortedIds,
      isAggregated,
    }),
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    // Не ретраим 4xx — они не исправятся сами по себе
    retry: (failureCount, err) => {
      const status = (err as { status?: number }).status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return transformDailyGraphData(data, sortedIds, isAggregated, dateFrom, dateTo);
  }, [data, sortedIds, isAggregated, dateFrom, dateTo]);

  return { chartData, isLoading: isLoading && canFetch, error };
}
