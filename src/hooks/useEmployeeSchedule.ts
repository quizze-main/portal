import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export interface ScheduleSummary {
  workDays: number;
  extraShifts: number;
  daysOff: number;
  vacations: number;
  sickDays: number;
  absent: number;
  dayOffLieu: number;
  totalEntries: number;
  entries: Array<{
    id: string;
    employee_id: string;
    branch_id: string;
    date: string;
    shift_type: string;
    shift_number: number | null;
    time_start: string | null;
    time_end: string | null;
    note: string;
  }>;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useEmployeeSchedule(employeeId: string | null, month?: string) {
  const effectiveMonth = month || getCurrentMonth();

  const query = useQuery({
    queryKey: ['employeeSchedule', employeeId, effectiveMonth],
    queryFn: async () => {
      const result = await internalApiClient.getEmployeeScheduleSummary(employeeId!, effectiveMonth);
      return result.summary as ScheduleSummary;
    },
    enabled: !!employeeId,
    staleTime: 60_000,
  });

  return {
    summary: query.data ?? null,
    entries: query.data?.entries ?? [],
    isLoading: query.isLoading,
    error: query.error,
    month: effectiveMonth,
  };
}
