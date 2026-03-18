import { useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export const useAdminKbImport = () => {
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: (files: File[]) => internalApiClient.previewKbImport(files),
  });

  const importMutation = useMutation({
    mutationFn: ({ files, collectionId }: { files: File[]; collectionId: string }) =>
      internalApiClient.importKbArticles(files, collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'kb', 'articles'] });
    },
  });

  return {
    previewMutation,
    importMutation,
  };
};
