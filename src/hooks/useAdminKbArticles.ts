import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';

export const useAdminKbArticles = () => {
  const [collectionFilter, setCollectionFilter] = useState<string>('');

  const collections = useQuery({
    queryKey: ['admin', 'kb', 'collections'],
    queryFn: () => internalApiClient.getKbCollections(),
    staleTime: 60_000,
  });

  // Fetch ALL articles once; filter client-side so we can compute per-collection counts
  const allArticles = useQuery({
    queryKey: ['admin', 'kb', 'articles'],
    queryFn: () => internalApiClient.getKbArticles(),
    staleTime: 30_000,
  });

  // Per-collection article counts
  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (allArticles.data || []).forEach((a) => {
      if (a.collectionId) {
        counts.set(a.collectionId, (counts.get(a.collectionId) || 0) + 1);
      }
    });
    return counts;
  }, [allArticles.data]);

  // Filtered articles based on selected collection
  const filteredArticles = useMemo(() => {
    if (!allArticles.data) return undefined;
    if (!collectionFilter) return allArticles.data;
    return allArticles.data.filter((a) => a.collectionId === collectionFilter);
  }, [allArticles.data, collectionFilter]);

  // Return articles query shape but with filtered data
  const articles = {
    ...allArticles,
    data: filteredArticles,
  };

  return {
    articles,
    collections,
    collectionFilter,
    setCollectionFilter,
    collectionCounts,
  };
};
