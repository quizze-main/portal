import { useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, MetricPlan } from '@/lib/internalApiClient';

export function useSetPlan() {
  const queryClient = useQueryClient();

  /** Check if a plan already exists for metric + branch + period */
  const checkExistingPlan = async (
    metricId: string,
    period: string,
    branchId: string,
  ): Promise<MetricPlan | null> => {
    const plans = await internalApiClient.getMetricPlansMatrix(metricId, period);
    return plans.find(p => p.scope === 'branch' && p.scopeId === branchId) || null;
  };

  /** Fetch managers for a given branch */
  const fetchBranchManagers = async (branchId: string) => {
    return internalApiClient.getEmployeesByStores({
      storeIds: [branchId],
      onlyManagers: true,
      limit: 500,
    });
  };

  /** Submit branch plan + employee distribution based on strategy */
  const submitMutation = useMutation({
    mutationFn: async (params: {
      metricId: string;
      branchId: string;
      period: string;
      planValue: number;
      managerIds: string[];
      strategy: 'divide' | 'replicate';
    }) => {
      const { metricId, branchId, period, planValue, managerIds, strategy } = params;
      const count = managerIds.length;

      const entries: Partial<MetricPlan>[] = [
        { metricId, scope: 'branch', scopeId: branchId, period, planValue },
      ];

      if (count > 0) {
        if (strategy === 'replicate') {
          // Averaged/percentage metrics: each manager gets the full plan value
          managerIds.forEach((empId) => {
            entries.push({ metricId, scope: 'employee', scopeId: empId, period, planValue });
          });
        } else {
          // Absolute metrics: divide plan among managers
          const base = Math.floor((planValue / count) * 100) / 100;
          const remainder = Math.round((planValue - base * count) * 100) / 100;
          managerIds.forEach((empId, i) => {
            entries.push({
              metricId,
              scope: 'employee',
              scopeId: empId,
              period,
              planValue: i === count - 1 ? base + remainder : base,
            });
          });
        }
      }

      return internalApiClient.bulkCreateMetricPlans(entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-metric-plans'] });
    },
  });

  /** Submit fact value for a manual metric (monthly) */
  const factMutation = useMutation({
    mutationFn: async (params: {
      metricId: string;
      period: string;
      storeId: string;
      fact: number;
    }) => {
      return internalApiClient.saveManualData(params.metricId, {
        period: params.period,
        storeId: params.storeId,
        fact: params.fact,
        plan: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-metric-plans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  /** Fetch daily facts for a specific date + store */
  const fetchDailyFacts = async (date: string, storeId?: string) => {
    return internalApiClient.getDailyFacts(date, storeId);
  };

  /** Batch save daily facts */
  const dailyFactsMutation = useMutation({
    mutationFn: async (params: {
      date: string;
      storeId: string;
      entries: { metricId: string; fact: number }[];
    }) => {
      return internalApiClient.saveDailyFacts(params.date, params.storeId, params.entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-facts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  return {
    checkExistingPlan,
    fetchBranchManagers,
    submit: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitFact: factMutation.mutateAsync,
    isSubmittingFact: factMutation.isPending,
    fetchDailyFacts,
    submitDailyFacts: dailyFactsMutation.mutateAsync,
    isSubmittingDailyFacts: dailyFactsMutation.isPending,
  };
}
