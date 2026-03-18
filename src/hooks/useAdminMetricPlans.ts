import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, MetricPlan } from '@/lib/internalApiClient';

const QUERY_KEY = 'admin-metric-plans';

export function useAdminMetricPlans(metricId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = [QUERY_KEY, metricId];

  const query = useQuery({
    queryKey,
    queryFn: () => internalApiClient.getMetricPlans(metricId!),
    enabled: !!metricId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<MetricPlan>) => internalApiClient.createMetricPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MetricPlan> }) =>
      internalApiClient.updateMetricPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteMetricPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (entries: Partial<MetricPlan>[]) => internalApiClient.bulkCreateMetricPlans(entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    plans: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createPlan: createMutation.mutateAsync,
    updatePlan: updateMutation.mutateAsync,
    deletePlan: deleteMutation.mutateAsync,
    bulkCreate: bulkMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
