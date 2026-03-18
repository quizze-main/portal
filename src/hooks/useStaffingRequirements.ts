import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';
import type { StaffingRequirement, StaffingRequirementInput, DayCoverage, DesignationActual } from '@/types/staffing-requirements';
import type { ShiftEntry } from '@/types/shift-schedule';

interface Employee {
  name: string;
  employee_name: string;
  designation?: string;
}

export function useStaffingRequirements(branchId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['staffing-requirements', branchId];

  const requirementsQuery = useQuery<{ requirements: StaffingRequirement[] }>({
    queryKey,
    queryFn: () => internalApiClient.getStaffingRequirements(branchId!),
    enabled: !!branchId,
    staleTime: 60_000,
  });

  const upsertMutation = useMutation({
    mutationFn: (input: StaffingRequirementInput) => internalApiClient.upsertStaffingRequirement(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteStaffingRequirement(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<{ requirements: StaffingRequirement[] }>(queryKey);
      queryClient.setQueryData<{ requirements: StaffingRequirement[] }>(queryKey, (old) => {
        if (!old) return old;
        return { requirements: old.requirements.filter(r => r.id !== id) };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const requirements = requirementsQuery.data?.requirements || [];

  return {
    requirements,
    isLoading: requirementsQuery.isLoading,
    upsertRequirement: upsertMutation.mutateAsync,
    deleteRequirement: deleteMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || deleteMutation.isPending,
  };
}

/**
 * Compute coverage for each day in a month by matching entries against requirements.
 * All computation is client-side — no extra API call needed.
 */
export function useCoverage(
  month: string,
  requirements: StaffingRequirement[],
  entries: ShiftEntry[],
  employees: Employee[],
): DayCoverage[] {
  return useMemo(() => {
    if (!requirements.length) return [];

    const [year, m] = month.split('-').map(Number);
    const daysCount = new Date(year, m, 0).getDate();

    // Build employee designation map
    const empDesignation = new Map<string, string>();
    const empName = new Map<string, string>();
    for (const emp of employees) {
      if (emp.designation) empDesignation.set(emp.name, emp.designation);
      empName.set(emp.name, emp.employee_name);
    }

    // Index entries by date
    const entriesByDate = new Map<string, ShiftEntry[]>();
    for (const e of entries) {
      if (e.shift_type !== 'work' && e.shift_type !== 'extra_shift') continue;
      const list = entriesByDate.get(e.date) || [];
      list.push(e);
      entriesByDate.set(e.date, list);
    }

    const result: DayCoverage[] = [];

    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      const dt = new Date(year, m - 1, d);
      const jsDay = dt.getDay();
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun

      // Find applicable requirements for this day
      const dayReqs = requirements.filter(r =>
        r.day_of_week === null || r.day_of_week === dayOfWeek
      );

      if (!dayReqs.length) {
        result.push({
          date: dateStr,
          dayOfWeek,
          required: [],
          actual: [],
          totalRequired: 0,
          totalScheduled: 0,
        });
        continue;
      }

      // Aggregate requirements by designation (prefer specific day_of_week over null)
      const reqMap = new Map<string, number>();
      for (const r of dayReqs) {
        const existing = reqMap.get(r.designation);
        // Specific day_of_week takes precedence
        if (existing == null || r.day_of_week !== null) {
          reqMap.set(r.designation, r.required_count);
        }
      }

      const required = Array.from(reqMap.entries()).map(([designation, count]) => ({ designation, count }));
      const totalRequired = required.reduce((sum, r) => sum + r.count, 0);

      // Count actual scheduled employees by designation
      const dayEntries = entriesByDate.get(dateStr) || [];
      const actualMap = new Map<string, { id: string; name: string }[]>();
      for (const e of dayEntries) {
        const desig = empDesignation.get(e.employee_id) || 'Без должности';
        const list = actualMap.get(desig) || [];
        list.push({ id: e.employee_id, name: empName.get(e.employee_id) || e.employee_id });
        actualMap.set(desig, list);
      }

      const actual: DesignationActual[] = Array.from(actualMap.entries()).map(([designation, emps]) => ({
        designation,
        employees: emps,
      }));

      const totalScheduled = dayEntries.length;

      result.push({ date: dateStr, dayOfWeek, required, actual, totalRequired, totalScheduled });
    }

    return result;
  }, [month, requirements, entries, employees]);
}
