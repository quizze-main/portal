import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, DashboardMetricConfig } from '@/lib/internalApiClient';

const QUERY_KEY = ['admin-dashboard-metrics'];

export function useAdminDashboardMetrics() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => internalApiClient.getDashboardMetrics(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DashboardMetricConfig>) => internalApiClient.createDashboardMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DashboardMetricConfig> }) =>
      internalApiClient.updateDashboardMetric(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteDashboardMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => internalApiClient.reorderDashboardMetrics(ids),
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<DashboardMetricConfig[]>(QUERY_KEY);
      if (prev) {
        const idOrderMap = new Map(ids.map((id, i) => [id, i]));
        const reordered = prev.map(m => ({
          ...m,
          order: idOrderMap.has(m.id) ? idOrderMap.get(m.id)! : m.order,
        }));
        queryClient.setQueryData(QUERY_KEY, reordered);
      }
      return { prev };
    },
    onError: (_err, _ids, context) => {
      if (context?.prev) {
        queryClient.setQueryData(QUERY_KEY, context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    metrics: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createMetric: createMutation.mutateAsync,
    updateMetric: updateMutation.mutateAsync,
    deleteMetric: deleteMutation.mutateAsync,
    reorderMetrics: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
