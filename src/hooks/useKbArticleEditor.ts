import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export const useKbArticleEditor = (name?: string) => {
  const queryClient = useQueryClient();

  const article = useQuery({
    queryKey: ['admin', 'kb', 'article', name],
    queryFn: () => internalApiClient.getKbArticle(name!),
    enabled: !!name,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; content?: string; published?: number }) =>
      internalApiClient.updateKbArticle(name!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'kb', 'articles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'kb', 'article', name] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content?: string; published?: number; collectionId: string }) =>
      internalApiClient.createKbArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'kb', 'articles'] });
    },
  });

  return { article, updateMutation, createMutation };
};
