import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export const useAdminMailings = () => {
  const webhookInfo = useQuery({
    queryKey: ['admin', 'mailings', 'webhook'],
    queryFn: () => internalApiClient.getTelegramWebhookInfo(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const integrations = useQuery({
    queryKey: ['admin', 'integrations'],
    queryFn: () => internalApiClient.getAdminIntegrations(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return {
    webhookInfo,
    integrations,
  };
};
