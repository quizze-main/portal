import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';
import type { KPIConfig } from '@/data/salaryConfig';

export interface AutoResolvedKPI {
  fact: number;
  plan: number;
  percent: number;
  autoTierRange: string | null;
}

const EMPTY: Record<string, AutoResolvedKPI> = {};

export function useLinkedMetricValues(kpis: KPIConfig[], trackerStoreId?: string) {
  const linkedMetricIds = useMemo(
    () => kpis
      .filter(kpi => kpi.linkedMetricId && kpi.type !== 'multiplier')
      .map(kpi => kpi.linkedMetricId!)
      .filter((id, i, arr) => arr.indexOf(id) === i),
    [kpis],
  );

  const enabled = linkedMetricIds.length > 0 && Boolean(trackerStoreId);

  const query = useQuery({
    queryKey: ['motivation-metric-values', linkedMetricIds.sort().join(','), trackerStoreId],
    queryFn: () => internalApiClient.getMotivationMetricValues(linkedMetricIds, trackerStoreId!),
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const autoResolvedKPIs = useMemo(() => {
    if (!query.data) return EMPTY;

    const result: Record<string, AutoResolvedKPI> = {};
    let hasEntries = false;

    for (const kpi of kpis) {
      if (!kpi.linkedMetricId || kpi.type === 'multiplier') continue;
      const metricValue = query.data[kpi.linkedMetricId];
      if (!metricValue) continue;

      const { percent } = metricValue;

      // Find matching tier: highest minPercent where percent >= minPercent && percent <= maxPercent
      const sortedTiers = [...kpi.tiers].sort((a, b) => b.minPercent - a.minPercent);
      const matchingTier = sortedTiers.find(t => percent >= t.minPercent && percent <= t.maxPercent);

      result[kpi.id] = {
        fact: metricValue.fact,
        plan: metricValue.plan,
        percent,
        autoTierRange: matchingTier?.range ?? null,
      };
      hasEntries = true;
    }

    return hasEntries ? result : EMPTY;
  }, [query.data, kpis]);

  return {
    autoResolvedKPIs,
    isLoading: query.isLoading && enabled,
  };
}
