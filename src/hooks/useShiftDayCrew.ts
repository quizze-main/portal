import { useQuery } from '@tanstack/react-query';
import { internalApiClient, DayCrewMember } from '@/lib/internalApiClient';

export function useShiftDayCrew(branchId: string | null, date: string | null, enabled = true) {
  const query = useQuery<DayCrewMember[]>({
    queryKey: ['shift-day-crew', branchId, date],
    queryFn: async () => {
      const result = await internalApiClient.getDayCrewmates(branchId!, date!);
      return result.crew;
    },
    enabled: enabled && !!branchId && !!date,
    staleTime: 60_000,
  });

  return {
    crew: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
