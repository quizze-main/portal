import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export function useFactsOverview(date: string, storeIds: string[], enabled = true) {
  return useQuery({
    queryKey: ['facts-overview', date, storeIds.join(',')],
    queryFn: () => internalApiClient.getFactsOverview(date, storeIds),
    enabled: enabled && !!date && storeIds.length > 0,
    staleTime: 30_000,
  });
}
