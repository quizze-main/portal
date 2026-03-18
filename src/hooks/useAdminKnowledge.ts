import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';

export const useAdminKnowledge = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const collections = useQuery({
    queryKey: ['admin', 'knowledge', 'collections'],
    queryFn: () => internalApiClient.getOutlineCollections(),
    staleTime: 60_000,
  });

  const documents = useQuery({
    queryKey: ['admin', 'knowledge', 'documents'],
    queryFn: () => internalApiClient.getOutlineDocuments(),
    staleTime: 60_000,
  });

  const searchResults = useQuery({
    queryKey: ['admin', 'knowledge', 'search', searchQuery],
    queryFn: () => internalApiClient.searchOutlineDocuments(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 30_000,
  });

  return {
    collections,
    documents,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchQuery.length >= 2,
  };
};
