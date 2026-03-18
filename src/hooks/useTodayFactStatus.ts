import { useMemo } from 'react';
import { useFactHistory } from './useFactHistory';

export interface TodayFactStatus {
  filledCount: number;
  totalCount: number;
  isFilled: boolean;
  missedDates: string[];
  hasMissedDays: boolean;
  isLoading: boolean;
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useTodayFactStatus(storeId: string, manualMetricIds: string[]): TodayFactStatus {
  const hasMetrics = manualMetricIds.length > 0;
  const { data, isLoading } = useFactHistory(hasMetrics ? storeId : undefined, 7);
  const today = dateStr(new Date());

  const result = useMemo(() => {
    const total = manualMetricIds.length;
    if (!data?.history || total === 0) {
      return { filledCount: 0, totalCount: total, missedDates: [] as string[] };
    }

    // Today's fill count
    let filled = 0;
    for (const metricId of manualMetricIds) {
      const entries = data.history[metricId]?.entries;
      if (entries?.some(e => e.date === today && e.fact != null)) {
        filled++;
      }
    }

    // Missed dates: past 6 days (excluding today)
    const missed: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);

      let allFilled = true;
      for (const metricId of manualMetricIds) {
        const entries = data.history[metricId]?.entries;
        if (!entries?.some(e => e.date === ds && e.fact != null)) {
          allFilled = false;
          break;
        }
      }
      if (!allFilled) missed.push(ds);
    }

    return { filledCount: filled, totalCount: total, missedDates: missed };
  }, [data, manualMetricIds, today]);

  return {
    filledCount: result.filledCount,
    totalCount: result.totalCount,
    isFilled: result.totalCount > 0 && result.filledCount >= result.totalCount,
    missedDates: result.missedDates,
    hasMissedDays: result.missedDates.length > 0,
    isLoading,
  };
}
