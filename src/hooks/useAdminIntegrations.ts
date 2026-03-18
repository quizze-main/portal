import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export const useAdminIntegrations = () => {
  return useQuery({
    queryKey: ['admin', 'integrations'],
    queryFn: () => internalApiClient.getAdminIntegrations(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
