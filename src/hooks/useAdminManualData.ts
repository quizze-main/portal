import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, ManualDataEntry } from '@/lib/internalApiClient';

export function useAdminManualData(metricId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['admin-manual-data', metricId];

  const query = useQuery({
    queryKey,
    queryFn: () => internalApiClient.getManualData(metricId!),
    enabled: !!metricId,
  });

  const saveMutation = useMutation({
    mutationFn: (entry: ManualDataEntry) => internalApiClient.saveManualData(metricId!, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ period, storeId }: { period: string; storeId?: string }) =>
      internalApiClient.deleteManualData(metricId!, period, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    saveEntry: saveMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
