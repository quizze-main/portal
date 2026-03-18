import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, MotivationBranchPositionConfig } from '@/lib/internalApiClient';

const QUERY_KEY = ['motivation-configs'];

export function useMotivationConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => internalApiClient.getMotivationConfigs(),
  });

  const createMutation = useMutation({
    mutationFn: (config: MotivationBranchPositionConfig) =>
      internalApiClient.createMotivationConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, config }: { key: string; config: MotivationBranchPositionConfig }) =>
      internalApiClient.updateMotivationConfig(key, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => internalApiClient.deleteMotivationConfig(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    configs: query.data || {},
    isLoading: query.isLoading,
    createConfig: createMutation.mutateAsync,
    updateConfig: updateMutation.mutateAsync,
    deleteConfig: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
