import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';
import type { ShiftEntry, ShiftEntryInput, ShiftScheduleResponse, AutoFillParams, CopyWeekParams, ShiftTemplate, BulkResult } from '@/types/shift-schedule';

export function useShiftSchedule(branchId: string | null, month: string) {
  const queryClient = useQueryClient();
  const queryKey = ['shift-schedule', branchId, month];

  const scheduleQuery = useQuery<ShiftScheduleResponse>({
    queryKey,
    queryFn: () => internalApiClient.getShiftSchedule(branchId!, month),
    enabled: !!branchId && !!month,
    staleTime: 30_000,
  });

  // O(1) lookup map: "employee_id:YYYY-MM-DD" → ShiftEntry
  const entriesMap = useMemo(() => {
    const map = new Map<string, ShiftEntry>();
    for (const e of scheduleQuery.data?.entries || []) {
      map.set(`${e.employee_id}:${e.date}`, e);
    }
    return map;
  }, [scheduleQuery.data?.entries]);

  const getEntry = (employeeId: string, date: string): ShiftEntry | undefined => {
    return entriesMap.get(`${employeeId}:${date}`);
  };

  const upsertMutation = useMutation({
    mutationFn: (entry: ShiftEntryInput) => internalApiClient.upsertShiftEntry(entry),
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ShiftScheduleResponse>(queryKey);
      queryClient.setQueryData<ShiftScheduleResponse>(queryKey, (old) => {
        if (!old) return old;
        const entries = [...old.entries];
        const idx = entries.findIndex(e => e.employee_id === newEntry.employee_id && e.date === newEntry.date);
        const record: ShiftEntry = {
          id: idx >= 0 ? entries[idx].id : 'temp',
          ...newEntry,
        };
        if (idx >= 0) entries[idx] = record;
        else entries.push(record);
        return { ...old, entries };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const bulkMutation = useMutation<BulkResult, Error, ShiftEntryInput[]>({
    mutationFn: (entries) => internalApiClient.bulkUpsertShiftEntries(entries),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ employeeId, date }: { employeeId: string; date: string }) =>
      internalApiClient.deleteShiftEntry(employeeId, date),
    onMutate: async ({ employeeId, date }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ShiftScheduleResponse>(queryKey);
      queryClient.setQueryData<ShiftScheduleResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.filter(e => !(e.employee_id === employeeId && e.date === date)),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const autoFillMutation = useMutation<BulkResult, Error, AutoFillParams>({
    mutationFn: (params) => internalApiClient.autoFillShift(params),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const copyWeekMutation = useMutation<BulkResult, Error, CopyWeekParams>({
    mutationFn: (params) => internalApiClient.copyShiftWeek(params),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    entries: scheduleQuery.data?.entries || [],
    entriesMap,
    getEntry,
    isLoading: scheduleQuery.isLoading,
    isError: scheduleQuery.isError,
    upsertEntry: upsertMutation.mutateAsync,
    bulkUpsert: bulkMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    autoFill: autoFillMutation.mutateAsync,
    copyWeek: copyWeekMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || bulkMutation.isPending || autoFillMutation.isPending || copyWeekMutation.isPending,
    refetch: scheduleQuery.refetch,
  };
}

export function useShiftTemplates(branchId?: string) {
  return useQuery<{ templates: ShiftTemplate[] }>({
    queryKey: ['shift-templates', branchId],
    queryFn: () => internalApiClient.getShiftTemplates(branchId),
    staleTime: 5 * 60_000,
  });
}
