import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { useEmployee } from '@/contexts/EmployeeProvider';
import { MotivationMatrix, SalaryCalculator } from '@/components/salary';
import { BRANCHES, getAvailablePositions, getBranchName, type BranchId } from '@/data/branchData';
import {
  calculateSalary,
  getSalaryConfig,
  type BranchPositionConfig,
  type ClubLevel,
  type ManagerLevel,
  type MatchingCell,
} from '@/data/salaryConfig';
import { derivePositionIdFromDesignation, getAllowedBranchIds } from '@/lib/salaryAccess';
import { useMotivationConfig } from '@/hooks/useMotivationConfig';
import { useLinkedMetricValues } from '@/hooks/useLinkedMetricValues';

export default function BranchCalculatorPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { employee, storeOptions, employeeRole, hasAllBranchesAccess, canEditSalaryCalculator } = useEmployee();
  const { configs: apiConfigs } = useMotivationConfig();

  const canChangePosition = Boolean(canEditSalaryCalculator);
  const lockPositionToEmployee = !canChangePosition;

  const allowedBranchIds = useMemo(() => {
    return getAllowedBranchIds({
      hasAllBranchesAccess,
      storeOptions,
      employeeDepartment: employee?.department ?? null,
    });
  }, [employee?.department, hasAllBranchesAccess, storeOptions]);

  const resolvedBranchId = (branchId || '') as BranchId;
  const branchName = branchId ? getBranchName(branchId) : undefined;

  // Validate branch exists.
  const exists = Boolean(branchId && branchName && BRANCHES.some((b) => b.id === resolvedBranchId));
  if (!exists) return <Navigate to="/calculator" replace />;

  // Enforce access (unless "all branches").
  if (!hasAllBranchesAccess && !allowedBranchIds.includes(resolvedBranchId)) {
    return <Navigate to="/calculator" replace />;
  }

  const [selectedPosition, setSelectedPosition] = useState<string>(() => {
    return derivePositionIdFromDesignation({
      designation: employee?.designation,
      branchId: resolvedBranchId,
      shiftFormat: employee?.custom_employee_shift_format_kind ?? null,
    });
  });

  // Auto-pick position for non-leader users from Frappe designation.
  useEffect(() => {
    if (!lockPositionToEmployee) return;
    setSelectedPosition(derivePositionIdFromDesignation({
      designation: employee?.designation,
      branchId: resolvedBranchId,
      shiftFormat: employee?.custom_employee_shift_format_kind ?? null,
    }));
  }, [employee?.custom_employee_shift_format_kind, employee?.designation, lockPositionToEmployee, resolvedBranchId]);

  const availablePositions = useMemo(() => {
    return getAvailablePositions(resolvedBranchId);
  }, [resolvedBranchId]);

  useEffect(() => {
    if (availablePositions.length === 0) return;
    const ok = availablePositions.some((p) => p.id === selectedPosition);
    if (ok) return;
    if (lockPositionToEmployee) {
      setSelectedPosition(derivePositionIdFromDesignation({
        designation: employee?.designation,
        branchId: resolvedBranchId,
        shiftFormat: employee?.custom_employee_shift_format_kind ?? null,
      }));
    } else {
      setSelectedPosition(String(availablePositions[0].id));
    }
  }, [availablePositions, employee?.designation, lockPositionToEmployee, resolvedBranchId, selectedPosition]);

  const config = useMemo<BranchPositionConfig>(() => {
    const key = `${resolvedBranchId}_${selectedPosition}`;
    if (apiConfigs[key]) return apiConfigs[key] as unknown as BranchPositionConfig;
    return getSalaryConfig(resolvedBranchId, selectedPosition);
  }, [resolvedBranchId, selectedPosition, apiConfigs]);

  const { autoResolvedKPIs } = useLinkedMetricValues(
    config.kpis,
    (config as any).trackerStoreId,
  );

  const [calculatorKPIs, setCalculatorKPIs] = useState<Record<string, string | number>>({});

  useEffect(() => {
    const initial: Record<string, string | number> = {};
    config.kpis.forEach((kpi) => {
      if (kpi.type === 'multiplier') return;
      const autoResolved = autoResolvedKPIs[kpi.id];
      if (autoResolved?.autoTierRange) {
        initial[kpi.id] = autoResolved.autoTierRange;
      } else if (kpi.tiers.length > 0) {
        initial[kpi.id] = kpi.tiers[0].range;
      }
    });
    setCalculatorKPIs(initial);
  }, [config, autoResolvedKPIs]);

  const [calculatorResult, setCalculatorResult] = useState<{
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
    baseSalary?: number;
  } | null>(null);

  const handleCalculationChange = useCallback((result: {
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
    baseSalary?: number;
  }) => {
    setCalculatorResult(result);
  }, []);

  const [pendingCellClick, setPendingCellClick] = useState<{ clubLevel: ClubLevel; managerLevel: ManagerLevel } | null>(null);
  const handleMatrixCellClick = useCallback((clubLevel: ClubLevel, managerLevel: ManagerLevel) => {
    setPendingCellClick({ clubLevel, managerLevel });
  }, []);
  const handleCellClickProcessed = useCallback(() => setPendingCellClick(null), []);

  const forecastBreakdown = useMemo(() => {
    const personalFact = config.personalPlan * 0.87;
    const clubPercent = 95;
    // Use first tier of each tier-based KPI as default for forecast
    const defaultKPIs: Record<string, string | number> = {};
    config.kpis.forEach((kpi) => {
      if (kpi.type !== 'multiplier' && kpi.tiers.length > 0) {
        defaultKPIs[kpi.id] = kpi.tiers[0].range;
      }
    });
    return calculateSalary({
      personalFact,
      personalPlan: config.personalPlan,
      clubPercent,
      selectedKPIs: defaultKPIs,
      config,
    });
  }, [config]);

  const handleCalculatorKPIChange = (kpiId: string, tierRange: string | number | null) => {
    setCalculatorKPIs((prev) => {
      if (tierRange === null) {
        const { [kpiId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [kpiId]: tierRange };
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="px-4 py-4 max-w-full">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-primary">
            {branchName}
          </h1>
        </div>

        <div className="space-y-3">
          <SalaryCalculator
            config={config}
            selectedKPIs={calculatorKPIs}
            onKPIChange={handleCalculatorKPIChange}
            onCalculationChange={handleCalculationChange}
            pendingCellClick={pendingCellClick}
            onCellClickProcessed={handleCellClickProcessed}
            autoResolvedKPIs={autoResolvedKPIs}
          />

          <MotivationMatrix
            currentManagerLevel={calculatorResult?.managerLevel ?? forecastBreakdown.managerLevel}
            currentClubLevel={calculatorResult?.clubLevel ?? forecastBreakdown.clubLevel}
            personalFact={calculatorResult?.personalFact ?? config.personalPlan * 0.87}
            personalPlan={calculatorResult?.personalPlan ?? config.personalPlan}
            matchingCells={calculatorResult?.matchingCells}
            currentBonusPercent={calculatorResult?.currentBonusPercent}
            onCellClick={handleMatrixCellClick}
            matrix={config.matrix}
            baseSalary={calculatorResult?.baseSalary ?? config.baseSalary}
          />
        </div>
      </div>
    </div>
  );
}

