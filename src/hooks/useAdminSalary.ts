import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalApiClient, type Employee } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { BRANCHES, type BranchId } from '@/data/branchData';
import { calculateSalary, getSalaryConfig, type BranchPositionConfig, type SalaryBreakdown } from '@/data/salaryConfig';
import { derivePositionIdFromDesignation, mapBranchIdToStoreOption } from '@/lib/salaryAccess';
import { getSingleLeaderMetric, getManagerMetric } from '@/lib/leaderDashboardApi';
import type { SalarySessionEmployee, SalaryCalculationSession } from '@/types/salary-admin';

export interface EmployeeWithCalc {
  employee: Employee;
  positionId: string;
  config: BranchPositionConfig;
  // Tracker data
  branchPlan: number;
  branchFact: number;
  branchPercent: number;
  managerPlan: number;
  managerFact: number;
  managerPercent: number;
  // Editable inputs
  baseSalary: number;
  selectedKPIs: Record<string, string | number>;
  // Calculated
  breakdown: SalaryBreakdown | null;
  explanation: string;
}

/** Strip "itigris-" or "itigris_" prefix from Tracker manager keys */
function normalizeItigrisId(raw: string): string {
  return String(raw).trim().replace(/^itigris[-_]/i, '').trim();
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ru-RU');
}

function generateExplanation(
  config: BranchPositionConfig,
  breakdown: SalaryBreakdown,
  selectedKPIs: Record<string, string | number>,
): string {
  const parts: string[] = [];
  parts.push(`Оклад ${fmt(breakdown.baseSalary)} ₽`);
  parts.push(
    `Бонус ${breakdown.bonusPercent}% (клуб ${breakdown.clubLevel}, личный ${breakdown.managerLevel}) = ${fmt(breakdown.bonusAmount)} ₽`,
  );
  for (const kpi of config.kpis) {
    const val = selectedKPIs[kpi.id];
    if (val != null) {
      parts.push(`${kpi.label}: ${val}`);
    }
  }
  if (breakdown.kpiBonus > 0) {
    parts.push(`KPI бонус = ${fmt(breakdown.kpiBonus)} ₽`);
  }
  return parts.join(' | ');
}

/** Compute date_from and date_to from "YYYY-MM" period */
function periodToDateRange(period: string): { dateFrom: string; dateTo: string } {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const dateFrom = `${period}-01`;
  // Last day of the month
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}

export function useAdminSalary() {
  const { storeOptions } = useEmployee();
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = useState<BranchId | ''>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [employeeKPIs, setEmployeeKPIs] = useState<Map<string, Record<string, string | number>>>(new Map());
  const [employeeBaseSalaries, setEmployeeBaseSalaries] = useState<Map<string, number>>(new Map());

  // Resolve store option for the selected branch
  const selectedStoreOption = useMemo(() => {
    if (!selectedBranchId) return null;
    return mapBranchIdToStoreOption(selectedBranchId as BranchId, storeOptions);
  }, [selectedBranchId, storeOptions]);

  // Date range from period
  const { dateFrom, dateTo } = useMemo(() => periodToDateRange(selectedPeriod), [selectedPeriod]);

  // Fetch employees for the selected branch
  const employeesQuery = useQuery({
    queryKey: ['adminSalaryEmployees', selectedStoreOption?.department_id],
    queryFn: () => internalApiClient.getEmployeesByStores({
      departmentIds: selectedStoreOption?.department_id ? [selectedStoreOption.department_id] : [],
    }),
    enabled: !!selectedStoreOption?.department_id,
  });

  // Fetch branch-level metric (revenue_created)
  const branchMetricQuery = useQuery({
    queryKey: ['adminSalaryBranchMetric', selectedStoreOption?.store_id, dateFrom, dateTo],
    queryFn: () => getSingleLeaderMetric('revenue_created', {
      store_ids: selectedStoreOption?.store_id ? [selectedStoreOption.store_id] : [],
      date_from: dateFrom,
      date_to: dateTo,
    }),
    enabled: !!selectedStoreOption?.store_id,
  });

  // Fetch manager-level metrics (revenue_created per manager)
  const managerMetricQuery = useQuery({
    queryKey: ['adminSalaryManagerMetric', selectedStoreOption?.store_id, dateFrom, dateTo],
    queryFn: () => getManagerMetric('revenue_created', {
      store_ids: selectedStoreOption?.store_id ? [selectedStoreOption.store_id] : [],
      date_from: dateFrom,
      date_to: dateTo,
    }),
    enabled: !!selectedStoreOption?.store_id,
  });

  // Branch fact from Tracker API (plan comes from salary config, not Tracker)
  const branchFact = useMemo(() => {
    return branchMetricQuery.data?.current ?? 0;
  }, [branchMetricQuery.data]);

  // Build normalized manager data map: itigrisId → { fact, plan }
  const managerDataMap = useMemo(() => {
    const map = new Map<string, { fact: number; plan: number }>();
    const managers = managerMetricQuery.data?.managers;
    if (!managers) return map;
    for (const [rawKey, data] of Object.entries(managers)) {
      const id = normalizeItigrisId(rawKey);
      if (id) {
        map.set(id, {
          fact: data.fact_value ?? 0,
          plan: data.plan_value ?? 0,
        });
      }
    }
    return map;
  }, [managerMetricQuery.data]);

  // Resolve configs and merge with Tracker data
  const employeesWithCalc: EmployeeWithCalc[] = useMemo(() => {
    const employees = employeesQuery.data || [];
    if (!selectedBranchId) return [];

    const result = employees.map(emp => {
      const positionId = derivePositionIdFromDesignation({
        designation: emp.designation,
        branchId: selectedBranchId as BranchId,
        shiftFormat: emp.custom_employee_shift_format_kind ?? null,
      });
      const config = getSalaryConfig(selectedBranchId, positionId);

      // Branch plan from salary/motivation config, fact from Tracker API
      const branchPlan = config.clubPlan;
      const branchPercent = branchPlan > 0 ? (branchFact / branchPlan) * 100 : 0;
      const clubPercent = branchPercent;

      // Look up Tracker data for this employee
      const itigrisId = emp.custom_itigris_user_id || '';
      const mgrData = itigrisId ? managerDataMap.get(itigrisId) : undefined;
      const managerPlan = mgrData?.plan ?? 0;
      const managerFact = mgrData?.fact ?? 0;
      const managerPercent = managerPlan > 0 ? (managerFact / managerPlan) * 100 : 0;

      const selectedKPIs = employeeKPIs.get(emp.name || '') || {};
      const baseSalary = employeeBaseSalaries.get(emp.name || '') ?? config.baseSalary;

      // Auto-calculate salary when Tracker data is available
      let breakdown: SalaryBreakdown | null = null;
      let explanation = '';

      if (managerPlan > 0 || managerFact > 0) {
        breakdown = calculateSalary({
          personalFact: managerFact,
          personalPlan: managerPlan > 0 ? managerPlan : config.personalPlan,
          clubPercent,
          selectedKPIs,
          baseSalary,
          config,
        });
        explanation = generateExplanation(config, breakdown, selectedKPIs);
      }

      return {
        employee: emp,
        positionId,
        config,
        branchPlan,
        branchFact,
        branchPercent,
        managerPlan,
        managerFact,
        managerPercent,
        baseSalary,
        selectedKPIs,
        breakdown,
        explanation,
      };
    });

    // Sort: employees with Tracker data first, then those without
    result.sort((a, b) => {
      const aHasData = (a.managerPlan > 0 || a.managerFact > 0) ? 0 : 1;
      const bHasData = (b.managerPlan > 0 || b.managerFact > 0) ? 0 : 1;
      return aHasData - bHasData;
    });

    return result;
  }, [employeesQuery.data, selectedBranchId, branchFact, managerDataMap, employeeKPIs, employeeBaseSalaries]);

  // Update KPI for an employee
  const setKPI = useCallback((employeeId: string, kpiId: string, value: string | number | null) => {
    setEmployeeKPIs(prev => {
      const next = new Map(prev);
      const existing = next.get(employeeId) || {};
      const kpis = { ...existing };
      if (value === null) {
        delete kpis[kpiId];
      } else {
        kpis[kpiId] = value;
      }
      next.set(employeeId, kpis);
      return next;
    });
  }, []);

  // Update base salary for an employee
  const setBaseSalary = useCallback((employeeId: string, value: number) => {
    setEmployeeBaseSalaries(prev => {
      const next = new Map(prev);
      next.set(employeeId, value);
      return next;
    });
  }, []);

  // Totals
  const totals = useMemo(() => {
    let totalBase = 0;
    let totalBonus = 0;
    let totalKPI = 0;
    let totalSalary = 0;
    let hasAny = false;
    for (const e of employeesWithCalc) {
      if (e.breakdown) {
        hasAny = true;
        totalBase += e.breakdown.baseSalary;
        totalBonus += e.breakdown.bonusAmount;
        totalKPI += e.breakdown.kpiBonus;
        totalSalary += e.breakdown.total;
      }
    }
    if (!hasAny) return null;
    return { totalBase, totalBonus, totalKPI, totalSalary };
  }, [employeesWithCalc]);

  // Build session employees for saving
  const buildSessionEmployees = useCallback((): SalarySessionEmployee[] => {
    return employeesWithCalc
      .filter(e => e.breakdown)
      .map(e => ({
        employeeId: e.employee.name || '',
        employeeName: e.employee.employee_name || '',
        designation: e.employee.designation || '',
        positionId: e.positionId,
        branchPlan: e.branchPlan,
        branchFact: e.branchFact,
        branchPercent: e.branchPercent,
        managerPlan: e.managerPlan,
        managerFact: e.managerFact,
        managerPercent: e.managerPercent,
        selectedKPIs: e.selectedKPIs,
        baseSalary: e.breakdown!.baseSalary,
        bonusPercent: e.breakdown!.bonusPercent,
        bonusAmount: e.breakdown!.bonusAmount,
        kpiBonus: e.breakdown!.kpiBonus,
        total: e.breakdown!.total,
        managerLevel: e.breakdown!.managerLevel,
        clubLevel: e.breakdown!.clubLevel,
        explanation: e.explanation,
      }));
  }, [employeesWithCalc]);

  // Save session mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const sessionEmployees = buildSessionEmployees();
      // clubPercent from first employee's config-based branchPercent
      const clubPct = sessionEmployees.length > 0 ? sessionEmployees[0].branchPercent : 0;
      return internalApiClient.saveSalarySession({
        branchId: selectedBranchId,
        period: selectedPeriod,
        clubPercent: clubPct,
        employees: sessionEmployees,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarySessions'] });
    },
  });

  // Sessions list query
  const sessionsQuery = useQuery({
    queryKey: ['salarySessions'],
    queryFn: () => internalApiClient.getSalarySessions(),
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteSalarySession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarySessions'] });
    },
  });

  // Load session
  const loadSession = useCallback(async (id: string) => {
    const session: SalaryCalculationSession | null = await internalApiClient.getSalarySession(id);
    if (!session) return;

    setSelectedBranchId(session.branchId as BranchId);
    setSelectedPeriod(session.period);

    const inputs = new Map<string, Record<string, string | number>>();
    for (const emp of session.employees) {
      inputs.set(emp.employeeId, emp.selectedKPIs);
    }
    setEmployeeKPIs(inputs);
  }, []);

  // Reset
  const reset = useCallback(() => {
    setEmployeeKPIs(new Map());
    setEmployeeBaseSalaries(new Map());
  }, []);

  return {
    // State
    selectedBranchId,
    setSelectedBranchId: (id: string) => { setSelectedBranchId(id as BranchId | ''); reset(); },
    selectedPeriod,
    setSelectedPeriod,

    // Branch data (plan from config, fact from Tracker)
    branchFact,
    isLoadingBranchMetric: branchMetricQuery.isLoading,
    isLoadingManagerMetric: managerMetricQuery.isLoading,

    // Employees
    employeesWithCalc,
    isLoadingEmployees: employeesQuery.isLoading,
    employeesError: employeesQuery.error,

    // Input handlers
    setKPI,
    setBaseSalary,

    // Totals
    totals,

    // Sessions
    sessions: sessionsQuery.data || [],
    isLoadingSessions: sessionsQuery.isLoading,
    saveSession: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteSession: deleteMutation.mutateAsync,
    loadSession,

    // Export data
    buildSessionEmployees,

    // Available branches
    branches: BRANCHES,
    storeOptions,
  };
}
