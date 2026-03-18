import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';

export const useAdminOrg = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [limit, setLimit] = useState(30);

  const departments = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: () => internalApiClient.getDepartments(),
    staleTime: 5 * 60_000,
  });

  const employees = useQuery({
    queryKey: ['admin', 'org', 'employees', searchQuery, selectedDepartment, limit],
    queryFn: () => {
      if (searchQuery || selectedDepartment) {
        return internalApiClient.searchEmployees(searchQuery, selectedDepartment, limit);
      }
      return internalApiClient.searchEmployees('', '', limit);
    },
    staleTime: 30_000,
  });

  const loadMore = () => setLimit((prev) => prev + 30);

  return {
    departments,
    employees,
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    setSelectedDepartment,
    limit,
    loadMore,
  };
};
