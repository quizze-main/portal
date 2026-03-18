import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { internalApiClient, DataSourceConfig, DataSourceTestResult } from '@/lib/internalApiClient';

const QUERY_KEY = ['admin-data-sources'];

export function useAdminDataSources() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, DataSourceTestResult>>({});

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => internalApiClient.getDataSources(),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DataSourceConfig>) => internalApiClient.createDataSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DataSourceConfig> }) =>
      internalApiClient.updateDataSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteDataSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const testConnection = async (id: string) => {
    setTestingId(id);
    try {
      const result = await internalApiClient.testDataSource(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return result;
    } finally {
      setTestingId(null);
    }
  };

  const testInline = async (config: Partial<DataSourceConfig>) => {
    setTestingId('__inline__');
    try {
      const result = await internalApiClient.testDataSourceInline(config);
      setTestResults(prev => ({ ...prev, __inline__: result }));
      return result;
    } finally {
      setTestingId(null);
    }
  };

  return {
    sources: query.data?.sources || [],
    authTypes: query.data?.authTypes || {},
    paginationTypes: query.data?.paginationTypes || {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createSource: createMutation.mutateAsync,
    updateSource: updateMutation.mutateAsync,
    deleteSource: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    testConnection,
    testInline,
    testingId,
    testResults,
  };
}
