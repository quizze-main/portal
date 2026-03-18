import { useState, useMemo } from 'react';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';
import { useShiftSchedule, useShiftTemplates } from '@/hooks/useShiftSchedule';
import { useStaffingRequirements, useCoverage } from '@/hooks/useStaffingRequirements';
import { ShiftScheduleGrid } from '@/components/shift-schedule/ShiftScheduleGrid';
import { ShiftMonthNavigator } from '@/components/shift-schedule/ShiftMonthNavigator';
import { ShiftToolbar } from '@/components/shift-schedule/ShiftToolbar';
import { ShiftTemplateDialog } from '@/components/shift-schedule/ShiftTemplateDialog';
import { ShiftLegend } from '@/components/shift-schedule/ShiftLegend';
import { StaffingRequirementsDialog } from '@/components/shift-schedule/StaffingRequirementsDialog';
import { StaffingOverviewWidget } from '@/components/shift-schedule/StaffingOverviewWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import type { Employee } from '@/lib/internalApiClient';

type ShiftEmployee = { name: string; employee_name: string; designation?: string };

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ShiftSchedulePage() {
  const { employee, storeId, storeOptions, canUseLeaderDashboard, hasAllBranchesAccess } = useEmployee();
  const isLeader = canUseLeaderDashboard || hasAllBranchesAccess;

  const [month, setMonth] = useState(getCurrentMonth);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(storeId || '');

  const branchId = selectedBranchId || storeId || '';

  // Fetch employees for the branch
  const employeesQuery = useQuery<Employee[]>({
    queryKey: ['shift-employees', branchId],
    queryFn: () => internalApiClient.getEmployeesByStores({ storeIds: [branchId], limit: 100 }),
    enabled: !!branchId,
    staleTime: 5 * 60_000,
  });

  const { entries, entriesMap, isLoading, upsertEntry, bulkUpsert, deleteEntry, autoFill, isUpdating } = useShiftSchedule(branchId, month);
  const { data: templatesData } = useShiftTemplates(branchId);
  const templates = templatesData?.templates || [];

  // Staffing requirements
  const {
    requirements,
    upsertRequirement,
    deleteRequirement,
    isUpdating: isReqUpdating,
  } = useStaffingRequirements(branchId);

  // Filter employees: leaders see all, regular employees see only themselves
  const displayEmployees: ShiftEmployee[] = useMemo(() => {
    const allEmployees = (employeesQuery.data || []).map(e => ({
      name: e.name || '',
      employee_name: e.employee_name,
      designation: e.designation,
    }));
    if (isLeader) return allEmployees;
    if (employee?.name) {
      const found = allEmployees.find(e => e.name === employee.name);
      return found ? [found] : [];
    }
    return [];
  }, [employeesQuery.data, isLeader, employee]);

  // Unique designations for requirements dialog
  const uniqueDesignations = useMemo(() => {
    const set = new Set<string>();
    for (const emp of displayEmployees) {
      if (emp.designation) set.add(emp.designation);
    }
    return Array.from(set).sort();
  }, [displayEmployees]);

  // Compute coverage
  const coverageData = useCoverage(month, requirements, entries, displayEmployees);

  const handleUpsert = async (entry: Parameters<typeof upsertEntry>[0]) => {
    try {
      await upsertEntry({ ...entry, branch_id: branchId });
    } catch (err) {
      console.error('Failed to save shift:', err);
    }
  };

  const handleDelete = async (employeeId: string, date: string) => {
    try {
      await deleteEntry({ employeeId, date });
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const handleBulkUpsert = async (entries: Parameters<typeof bulkUpsert>[0]) => {
    try {
      await bulkUpsert(entries);
    } catch (err) {
      console.error('Bulk save failed:', err);
    }
  };

  const handleAutoFill = async (params: Parameters<typeof autoFill>[0]) => {
    try {
      await autoFill(params);
    } catch (err) {
      console.error('Auto-fill failed:', err);
    }
  };

  if (!employee) return null;

  return (
    <div className="p-4 pb-6 space-y-4 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">График смен</h1>
            {displayEmployees.length > 0 && (
              <p className="text-xs text-muted-foreground">{displayEmployees.length} сотр.</p>
            )}
          </div>
        </div>

        {/* Branch selector (only for multi-branch leaders) */}
        {isLeader && storeOptions && storeOptions.length > 1 && (
          <Select value={selectedBranchId || branchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="h-9 w-44 text-xs rounded-xl border-muted-foreground/20">
              <SelectValue placeholder="Филиал" />
            </SelectTrigger>
            <SelectContent>
              {storeOptions.map((s) => (
                <SelectItem key={s.store_id} value={s.store_id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Month navigator + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <ShiftMonthNavigator month={month} onChange={setMonth} />

        {isLeader && (
          <>
            <div className="w-px h-6 bg-border hidden sm:block" />
            <ShiftToolbar
              templates={templates}
              branchId={branchId}
              month={month}
              employees={displayEmployees}
              onAutoFill={handleAutoFill}
              isUpdating={isUpdating}
            />
            <ShiftTemplateDialog templates={templates} branchId={branchId} />
            <StaffingRequirementsDialog
              branchId={branchId}
              requirements={requirements}
              designations={uniqueDesignations}
              onUpsert={upsertRequirement}
              onDelete={deleteRequirement}
              isUpdating={isReqUpdating}
            />
          </>
        )}
      </div>

      {/* Staffing overview widget */}
      {coverageData.length > 0 && (
        <StaffingOverviewWidget coverageData={coverageData} month={month} />
      )}

      {/* Grid */}
      {isLoading || employeesQuery.isLoading ? (
        <div className="space-y-2 rounded-xl overflow-hidden">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : displayEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Нет сотрудников для отображения</p>
        </div>
      ) : (
        <ShiftScheduleGrid
          month={month}
          employees={displayEmployees}
          entriesMap={entriesMap}
          canEdit={isLeader}
          onUpsert={handleUpsert}
          onBulkUpsert={handleBulkUpsert}
          onDelete={handleDelete}
          coverageData={coverageData}
        />
      )}

      {/* Legend */}
      <ShiftLegend />
    </div>
  );
}
