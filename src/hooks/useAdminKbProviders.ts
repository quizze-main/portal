import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { internalApiClient, type KbProviderConfig, type KbTestResult } from '@/lib/internalApiClient';

export const useAdminKbProviders = () => {
  const queryClient = useQueryClient();
  const [testingType, setTestingType] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, KbTestResult>>({});

  const providers = useQuery({
    queryKey: ['admin', 'kb', 'providers'],
    queryFn: () => internalApiClient.getKbProviders(),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: ({ type, config }: { type: string; config: Partial<KbProviderConfig> }) =>
      internalApiClient.saveKbProvider(type, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'kb', 'providers'] });
    },
  });

  const testConnection = async (type: string, config?: Partial<KbProviderConfig>) => {
    setTestingType(type);
    try {
      const result = await internalApiClient.testKbProvider(type, config);
      setTestResult((prev) => ({ ...prev, [type]: result }));
      queryClient.invalidateQueries({ queryKey: ['admin', 'kb', 'providers'] });
      return result;
    } finally {
      setTestingType(null);
    }
  };

  return {
    providers,
    saveMutation,
    testConnection,
    testingType,
    testResult,
  };
};
