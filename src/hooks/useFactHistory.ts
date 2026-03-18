import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export function useFactHistory(storeId?: string, days = 14) {
  return useQuery({
    queryKey: ['fact-history', storeId, days],
    queryFn: () => internalApiClient.getFactHistory(storeId, days),
    staleTime: 30_000,
  });
}
