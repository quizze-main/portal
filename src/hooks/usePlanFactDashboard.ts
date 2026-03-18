import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminDashboardMetrics } from './useAdminDashboardMetrics';
import { internalApiClient, type DashboardMetricConfig, type MetricPlan, type LoovisStoreOption } from '@/lib/internalApiClient';
import { completionColor } from '@/lib/planFactUtils';

export interface CoverageCell {
  planValue: number | null;
  factValue: number | null;
  completionPercent: number | null;
}

export interface SummaryStats {
  total: number;
  withPlan: number;
  withFact: number;
  avgCompletion: number;
  attentionCount: number;
}

export interface BranchHealth {
  green: number;
  yellow: number;
  red: number;
  gray: number;
}

export interface PlanFactDashboardData {
  metrics: DashboardMetricConfig[];
  allMetrics: DashboardMetricConfig[];
  plans: MetricPlan[];
  /** metricId → storeId → CoverageCell */
  coverageMatrix: Map<string, Map<string, CoverageCell>>;
  summaryStats: SummaryStats;
  branchHealth: Map<string, BranchHealth>;
  isLoading: boolean;
}

export function usePlanFactDashboard(
  period: string,
  storeOptions: LoovisStoreOption[],
): PlanFactDashboardData {
  const { metrics: allMetrics, isLoading: metricsLoading } = useAdminDashboardMetrics();

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['admin-metric-plans', period],
    queryFn: () => internalApiClient.getMetricPlans(),
    staleTime: 30_000,
  });

  // ALL enabled metrics (not just manual)
  const metrics = useMemo(
    () => allMetrics.filter(m => m.enabled),
    [allMetrics],
  );

  const storeIds = useMemo(
    () => storeOptions.map(s => s.store_id),
    [storeOptions],
  );

  // Metric IDs that need API-fetched facts (non-manual sources)
  const apiMetricIds = useMemo(
    () => metrics.filter(m => m.source !== 'manual').map(m => m.id),
    [metrics],
  );

  // Fetch facts for non-manual metrics from all branches in parallel
  const { data: apiFacts, isLoading: apiFactsLoading } = useQuery({
    queryKey: ['plan-fact-api-values', period, apiMetricIds.join(','), storeIds.join(',')],
    queryFn: () => internalApiClient.getMetricValuesForBranches(apiMetricIds, storeIds, period),
    enabled: apiMetricIds.length > 0 && storeIds.length > 0,
    staleTime: 60_000,
  });

  // Build coverage matrix
  const coverageMatrix = useMemo(() => {
    const matrix = new Map<string, Map<string, CoverageCell>>();

    for (const metric of metrics) {
      const storeMap = new Map<string, CoverageCell>();

      for (const sid of storeIds) {
        // Find plan: scope=branch, scopeId=storeId, period matches
        const plan = plans.find(
          p => p.metricId === metric.id && p.scope === 'branch' && p.scopeId === sid && p.period === period,
        );
        // Also check network-level plan as fallback
        const networkPlan = !plan
          ? plans.find(p => p.metricId === metric.id && p.scope === 'network' && p.period === period)
          : null;

        let planValue = plan?.planValue ?? networkPlan?.planValue ?? null;

        // Find fact value based on source
        let factValue: number | null = null;

        if (metric.source === 'manual') {
          // Manual: from manualData array
          for (const entry of metric.manualData || []) {
            if (entry.period === period && (entry.storeId || '') === sid) {
              factValue = entry.fact || null;
              break;
            }
          }
        } else {
          // API-sourced (tracker, external_api, computed): from apiFacts
          const storeData = apiFacts?.[sid]?.[metric.id];
          if (storeData) {
            factValue = storeData.fact || null;
            // If no plan from MetricPlan, use API-returned plan as fallback
            if (planValue == null && storeData.plan > 0) {
              planValue = storeData.plan;
            }
          }
        }

        const completionPercent = planValue && planValue > 0 && factValue != null
          ? (factValue / planValue) * 100
          : null;

        storeMap.set(sid, { planValue, factValue, completionPercent });
      }

      matrix.set(metric.id, storeMap);
    }

    return matrix;
  }, [metrics, storeIds, plans, period, apiFacts]);

  // Summary stats
  const summaryStats = useMemo<SummaryStats>(() => {
    let withPlan = 0;
    let withFact = 0;
    let completionSum = 0;
    let completionCount = 0;
    let attentionCount = 0;

    coverageMatrix.forEach((storeMap) => {
      let metricHasPlan = false;
      let metricHasFact = false;

      storeMap.forEach(cell => {
        if (cell.planValue != null && cell.planValue > 0) metricHasPlan = true;
        if (cell.factValue != null && cell.factValue > 0) metricHasFact = true;
        if (cell.completionPercent != null) {
          completionSum += cell.completionPercent;
          completionCount++;
          if (cell.completionPercent < 70) attentionCount++;
        }
      });

      if (metricHasPlan) withPlan++;
      if (metricHasFact) withFact++;
    });

    return {
      total: metrics.length,
      withPlan,
      withFact,
      avgCompletion: completionCount > 0 ? completionSum / completionCount : 0,
      attentionCount,
    };
  }, [coverageMatrix, metrics.length]);

  // Branch health
  const branchHealth = useMemo(() => {
    const health = new Map<string, BranchHealth>();

    for (const sid of storeIds) {
      const h: BranchHealth = { green: 0, yellow: 0, red: 0, gray: 0 };

      coverageMatrix.forEach((storeMap) => {
        const cell = storeMap.get(sid);
        if (!cell) { h.gray++; return; }
        const color = completionColor(cell.completionPercent);
        h[color]++;
      });

      health.set(sid, h);
    }

    return health;
  }, [storeIds, coverageMatrix]);

  return {
    metrics,
    allMetrics,
    plans,
    coverageMatrix,
    summaryStats,
    branchHealth,
    isLoading: metricsLoading || plansLoading || (apiMetricIds.length > 0 && apiFactsLoading),
  };
}
