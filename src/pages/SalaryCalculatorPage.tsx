import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Calculator, ChevronDown, Pencil, Save, X, RotateCcw, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { internalApiClient, type Employee } from '@/lib/internalApiClient';
import {
  MotivationMatrix,
  SalaryCalculator,
  KPIEditor,
} from '@/components/salary';
import {
  calculateSalary,
  hasSpecificBranchConfig,
  hasSpecificConfig,
  type ManagerLevel,
  type ClubLevel,
  type MatchingCell,
  type BranchPositionConfig,
  type MotivationMatrixType,
  type LevelDefinition,
  type KPIConfig,
} from '@/data/salaryConfig';
import { useSalaryConfig, useSalaryConfigs, useSalaryConfigMutation, useSalaryConfigDeleteMutation, useSalaryConfigSource } from '@/hooks/useSalaryConfig';
import { useLinkedMetricValues } from '@/hooks/useLinkedMetricValues';
import { useAxisMetricValues } from '@/hooks/useAxisMetricValues';
import { useMotivationConfig } from '@/hooks/useMotivationConfig';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { derivePositionIdFromDesignation, getAllowedBranchIds, mapBranchIdToStoreOption } from '@/lib/salaryAccess';
import { useSalaryForecast } from '@/hooks/useSalaryForecast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BRANCHES, getAvailablePositions, type BranchId } from '@/data/branchData';
import { getSalaryConfig as getLocalConfig } from '@/data/salaryConfig';

/** Sentinel value for the "По должности" (generic/no specific employee) option */
const GENERIC_EMPLOYEE_VALUE = '__generic__';

export default function SalaryCalculatorPage() {
  // Apply overbrain-theme to <html> so portals (Select, Popover) also inherit the theme
  useEffect(() => {
    document.documentElement.classList.add('overbrain-theme');
    return () => document.documentElement.classList.remove('overbrain-theme');
  }, []);

  const { employee, storeOptions, employeeRole, hasAllBranchesAccess, canEditSalaryCalculator } = useEmployee();

  // Only leaders / elevated-access users can switch positions in calculator.
  const canChangePosition = Boolean(canEditSalaryCalculator);
  const lockPositionToEmployee = !canChangePosition;

  const allowedBranchIds = useMemo(() => {
    return getAllowedBranchIds({
      hasAllBranchesAccess,
      storeOptions,
      employeeDepartment: employee?.department ?? null,
    });
  }, [employee?.department, hasAllBranchesAccess, storeOptions]);

  const allowedBranches = useMemo(() => {
    if (hasAllBranchesAccess) return BRANCHES;
    const allow = new Set<string>(allowedBranchIds);
    return BRANCHES.filter((b) => allow.has(b.id));
  }, [allowedBranchIds, hasAllBranchesAccess]);

  const initialBranch = useMemo<BranchId>(() => {
    if (hasAllBranchesAccess) return 'moscow_club';
    return (allowedBranchIds[0] ?? 'moscow_club') as BranchId;
  }, [allowedBranchIds, hasAllBranchesAccess]);

  const [selectedBranch, setSelectedBranch] = useState<BranchId>(initialBranch);
  const [selectedPosition, setSelectedPosition] = useState<string>(() => {
    return derivePositionIdFromDesignation({
      designation: employee?.designation,
      branchId: initialBranch,
      shiftFormat: employee?.custom_employee_shift_format_kind ?? null,
    });
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(GENERIC_EMPLOYEE_VALUE);

  const [calculatorKPIs, setCalculatorKPIs] = useState<Record<string, string | number>>({
    closure_time: '90-100%',
  });

  // --- Edit mode ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editConfig, setEditConfig] = useState<BranchPositionConfig | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Keep selectedBranch in allowed set (when access loads async).
  useEffect(() => {
    if (hasAllBranchesAccess) return;
    if (allowedBranchIds.length === 0) return;
    if (allowedBranchIds.includes(selectedBranch)) return;
    setSelectedBranch(allowedBranchIds[0] as BranchId);
  }, [allowedBranchIds, hasAllBranchesAccess, selectedBranch]);

  // Reset employee selection when branch changes
  useEffect(() => {
    setSelectedEmployeeId(GENERIC_EMPLOYEE_VALUE);
  }, [selectedBranch]);

  // Auto-pick position for non-leader users from Frappe designation.
  useEffect(() => {
    if (!lockPositionToEmployee) return;
    setSelectedPosition(derivePositionIdFromDesignation({
      designation: employee?.designation,
      branchId: selectedBranch,
      shiftFormat: employee?.custom_employee_shift_format_kind ?? null,
    }));
  }, [employee?.custom_employee_shift_format_kind, employee?.designation, lockPositionToEmployee, selectedBranch]);

  // Effective employee ID (null when "По должности" is selected)
  const effectiveEmployeeId = selectedEmployeeId === GENERIC_EMPLOYEE_VALUE ? null : selectedEmployeeId;

  // Получаем конфигурацию из API с fallback на хардкод
  // Priority: employee override → position config → local default
  const baseConfig = useSalaryConfig(selectedBranch, selectedPosition, effectiveEmployeeId);
  const { isEmployeeOverride, hasEmployeeOverride } = useSalaryConfigSource(selectedBranch, selectedPosition, effectiveEmployeeId);
  const saveMutation = useSalaryConfigMutation();
  const deleteMutation = useSalaryConfigDeleteMutation();

  // Активная конфигурация (edit draft или base)
  const config = isEditMode && editConfig ? editConfig : baseConfig;

  // KPI ↔ Метрики: авто-привязка через trackerStoreId из мотивационного конфига
  const { configs: motivationApiConfigs } = useMotivationConfig();
  const motivationApiConfig = motivationApiConfigs?.[`${selectedBranch}_${selectedPosition}`];
  const trackerStoreId = (motivationApiConfig as any)?.trackerStoreId || undefined;
  const { autoResolvedKPIs } = useLinkedMetricValues(config.kpis, trackerStoreId);

  // Авто-значения план/факт для осей матрицы (привязанных к метрикам)
  const { managerMetric, clubMetric, refetch: refetchAxisMetrics, isRefetching: isAxisMetricsRefetching } = useAxisMetricValues(
    config.managerLinkedMetricId,
    config.clubLinkedMetricId,
    trackerStoreId,
  );

  // Dashboard metrics для KPIEditor (linking KPI to metric)
  const { metrics: dashboardMetrics } = useAdminDashboardMetrics();

  // Названия привязанных метрик для отображения в калькуляторе
  const enabledMetrics = useMemo(
    () => dashboardMetrics?.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name })),
    [dashboardMetrics],
  );
  const managerMetricName = useMemo(
    () => config.managerLinkedMetricId ? enabledMetrics?.find(m => m.id === config.managerLinkedMetricId)?.name ?? null : null,
    [config.managerLinkedMetricId, enabledMetrics],
  );
  const clubMetricName = useMemo(
    () => config.clubLinkedMetricId ? enabledMetrics?.find(m => m.id === config.clubLinkedMetricId)?.name ?? null : null,
    [config.clubLinkedMetricId, enabledMetrics],
  );

  // При входе в edit mode — клонируем конфиг
  const enterEditMode = useCallback(() => {
    setEditConfig(JSON.parse(JSON.stringify(baseConfig)));
    setSaveError(null);
    setIsEditMode(true);
  }, [baseConfig]);

  const cancelEditMode = useCallback(() => {
    setEditConfig(null);
    setSaveError(null);
    setIsEditMode(false);
  }, []);

  const saveConfig = useCallback(() => {
    if (!editConfig) return;
    setSaveError(null);
    let key = `${selectedBranch}_${selectedPosition}`;
    if (effectiveEmployeeId) {
      key += `_emp_${effectiveEmployeeId}`;
    }
    const configToSave = {
      ...editConfig,
      branchId: selectedBranch,
      positionId: selectedPosition,
      ...(effectiveEmployeeId ? { employeeId: effectiveEmployeeId } : {}),
    };
    saveMutation.mutate(
      { key, config: configToSave },
      {
        onSuccess: () => {
          setEditConfig(null);
          setIsEditMode(false);
        },
        onError: (err) => {
          setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
        },
      }
    );
  }, [editConfig, selectedBranch, selectedPosition, effectiveEmployeeId, saveMutation]);

  const { data: allServerConfigs } = useSalaryConfigs();

  const resetToDefaults = useCallback(() => {
    if (effectiveEmployeeId) {
      // For employee override: reset to position-level config (not hardcoded)
      const posKey = `${selectedBranch}_${selectedPosition}`;
      const posConfig = allServerConfigs?.[posKey] as BranchPositionConfig | undefined;
      setEditConfig(JSON.parse(JSON.stringify(posConfig ?? getLocalConfig(selectedBranch, selectedPosition))));
    } else {
      // For position-level: reset to hardcoded default
      const localDefault = getLocalConfig(selectedBranch, selectedPosition);
      setEditConfig(JSON.parse(JSON.stringify(localDefault)));
    }
  }, [selectedBranch, selectedPosition, effectiveEmployeeId, allServerConfigs]);

  const deleteEmployeeOverride = useCallback(() => {
    if (!effectiveEmployeeId) return;
    const empKey = `${selectedBranch}_${selectedPosition}_emp_${effectiveEmployeeId}`;
    deleteMutation.mutate(empKey, {
      onSuccess: () => cancelEditMode(),
      onError: (err) => {
        setSaveError(err instanceof Error ? err.message : 'Ошибка удаления');
      },
    });
  }, [effectiveEmployeeId, selectedBranch, selectedPosition, deleteMutation, cancelEditMode]);

  // Edit handlers
  const handleMatrixChange = useCallback((matrix: MotivationMatrixType) => {
    setEditConfig(prev => prev ? { ...prev, matrix } : null);
  }, []);

  const handleManagerLevelsChange = useCallback((levels: LevelDefinition[]) => {
    setEditConfig(prev => prev ? { ...prev, managerLevels: levels } : null);
  }, []);

  const handleClubLevelsChange = useCallback((levels: LevelDefinition[]) => {
    setEditConfig(prev => prev ? { ...prev, clubLevels: levels } : null);
  }, []);

  const handleKPIsChange = useCallback((kpis: KPIConfig[]) => {
    setEditConfig(prev => prev ? { ...prev, kpis } : null);
  }, []);

  const handleBaseSalaryChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) setEditConfig(prev => prev ? { ...prev, baseSalary: num } : null);
  }, []);

  const handlePersonalPlanChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) setEditConfig(prev => prev ? { ...prev, personalPlan: num } : null);
  }, []);

  const handleClubPlanChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) setEditConfig(prev => prev ? { ...prev, clubPlan: num } : null);
  }, []);

  const handleManagerAxisLabelChange = useCallback((label: string) => {
    setEditConfig(prev => prev ? { ...prev, managerAxisLabel: label } : null);
  }, []);

  const handleClubAxisLabelChange = useCallback((label: string) => {
    setEditConfig(prev => prev ? { ...prev, clubAxisLabel: label } : null);
  }, []);

  const handleManagerLinkedMetricChange = useCallback((metricId: string | null) => {
    setEditConfig(prev => prev ? { ...prev, managerLinkedMetricId: metricId } : null);
  }, []);

  const handleClubLinkedMetricChange = useCallback((metricId: string | null) => {
    setEditConfig(prev => prev ? { ...prev, clubLinkedMetricId: metricId } : null);
  }, []);

  // Состояние для динамического результата из калькулятора
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

  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [pendingCellClick, setPendingCellClick] = useState<{ clubLevel: ClubLevel; managerLevel: ManagerLevel } | null>(null);

  const handleMatrixCellClick = useCallback((clubLevel: ClubLevel, managerLevel: ManagerLevel) => {
    setPendingCellClick({ clubLevel, managerLevel });
  }, []);

  const handleCellClickProcessed = useCallback(() => {
    setPendingCellClick(null);
  }, []);

  // Filter positions based on selected branch
  const availablePositions = useMemo(() => {
    return getAvailablePositions(selectedBranch);
  }, [selectedBranch]);

  // Ensure selectedPosition exists for branch.
  useEffect(() => {
    if (availablePositions.length === 0) return;
    const ok = availablePositions.some((p) => p.id === selectedPosition);
    if (ok) return;

    if (lockPositionToEmployee) {
      setSelectedPosition(derivePositionIdFromDesignation({
        designation: employee?.designation,
        branchId: selectedBranch,
        shiftFormat: employee?.custom_employee_shift_format_kind ?? null,
      }));
    } else {
      setSelectedPosition(String(availablePositions[0].id));
    }
  }, [availablePositions, employee?.designation, lockPositionToEmployee, selectedBranch, selectedPosition]);

  // Exit edit mode when branch or employee changes
  useEffect(() => {
    if (isEditMode) {
      cancelEditMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, selectedEmployeeId]);

  // When position changes during edit mode (only for "По должности" mode) — reload config
  useEffect(() => {
    if (isEditMode && !effectiveEmployeeId) {
      setEditConfig(JSON.parse(JSON.stringify(baseConfig)));
      setSaveError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPosition]);

  // Сбрасываем KPI при смене конфигурации + авто-выбор из метрик
  useEffect(() => {
    const initialKPIs: Record<string, string | number> = {};
    config.kpis.forEach(kpi => {
      if (kpi.type === 'multiplier') return;
      const autoResolved = autoResolvedKPIs[kpi.id];
      if (autoResolved?.autoTierRange) {
        initialKPIs[kpi.id] = autoResolved.autoTierRange;
      } else if (kpi.tiers.length > 0) {
        initialKPIs[kpi.id] = kpi.tiers[0].range;
      }
    });
    setCalculatorKPIs(initialKPIs);
  }, [config, autoResolvedKPIs]);

  // --- Forecast ---
  const selectedStoreOption = useMemo(
    () => mapBranchIdToStoreOption(selectedBranch, storeOptions),
    [selectedBranch, storeOptions]
  );

  // Fetch employees for the selected branch (leaders only)
  const branchEmployeesQuery = useQuery({
    queryKey: ['salaryCalcEmployees', selectedStoreOption?.department_id],
    queryFn: () => internalApiClient.getEmployeesByStores({
      departmentIds: selectedStoreOption?.department_id ? [selectedStoreOption.department_id] : [],
    }),
    enabled: canChangePosition && !!selectedStoreOption?.department_id,
  });
  const branchEmployees: Employee[] = branchEmployeesQuery.data ?? [];

  // Resolve the currently selected employee (null when in generic mode)
  const selectedEmployee: Employee | null = useMemo(() => {
    if (selectedEmployeeId === GENERIC_EMPLOYEE_VALUE) return null;
    return branchEmployees.find((e) => e.name === selectedEmployeeId) ?? null;
  }, [selectedEmployeeId, branchEmployees]);

  // Handle employee selection: auto-fill position from their designation
  const handleEmployeeChange = useCallback((value: string) => {
    setSelectedEmployeeId(value);
    if (value === GENERIC_EMPLOYEE_VALUE) {
      setSelectedPosition(String(availablePositions[0]?.id ?? 'manager'));
      return;
    }
    const emp = branchEmployees.find((e) => e.name === value);
    if (emp) {
      setSelectedPosition(derivePositionIdFromDesignation({
        designation: emp.designation,
        branchId: selectedBranch,
        shiftFormat: emp.custom_employee_shift_format_kind ?? null,
      }));
    }
  }, [branchEmployees, selectedBranch, availablePositions]);

  // When a specific employee is selected, use ONLY their itigris ID (no fallback to current user).
  // When in generic mode ("По должности"), use the current logged-in user's ID.
  const itigrisUserId = effectiveEmployeeId
    ? (selectedEmployee?.custom_itigris_user_id ?? null)
    : (employee?.custom_itigris_user_id ?? null);
  const canForecast = Boolean(itigrisUserId && selectedStoreOption?.store_id);

  const {
    forecastData,
    isLoading: isForecastLoading,
    error: forecastError,
    fetchForecast,
    clearForecast,
  } = useSalaryForecast({
    storeId: selectedStoreOption?.store_id ?? null,
    itigrisUserId,
    managerMetricCode: config.managerLinkedMetricId || undefined,
    clubMetricCode: config.clubLinkedMetricId || undefined,
  });

  // Auto-fetch forecast when canForecast becomes true (or branch/employee changes)
  useEffect(() => {
    clearForecast();
    if (canForecast) {
      fetchForecast();
    }
  }, [selectedBranch, selectedEmployeeId, canForecast, clearForecast, fetchForecast]);

  // Дефолтные значения из конфигурации для начального расчёта
  const forecastBreakdown = useMemo(() => {
    const personalFact = config.personalPlan * 0.87;
    const clubPercent = 95;
    const defaultKPIs: Record<string, string | number> = {};
    config.kpis.forEach(kpi => {
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

  // If we cannot resolve allowed branches for restricted users, block access.
  if (!hasAllBranchesAccess && allowedBranchIds.length === 0) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="px-4 py-4 max-w-full">
          <div className="text-center text-sm text-muted-foreground">
            Не удалось определить доступные филиалы для калькулятора.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="px-4 py-4 max-w-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1" />
            <h1 className="text-xl font-bold text-primary text-center flex-1 whitespace-nowrap">
              Моя мотивация
            </h1>
            <div className="flex-1 flex justify-end">
              {canEditSalaryCalculator && (
                <>
                  {!isEditMode ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={enterEditMode}
                      className="h-9 w-9"
                      title="Редактировать конфигурацию"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetToDefaults}
                        className="h-8 w-8"
                        title={effectiveEmployeeId ? 'Сбросить к настройкам должности' : 'Сбросить к дефолту'}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEditMode}
                        className="h-8 w-8 text-destructive"
                        title="Отмена"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={saveConfig}
                        className="h-8 w-8"
                        title="Сохранить"
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {hasAllBranchesAccess && (
            <div className="flex justify-center mb-4">
              <Link to="/admin/salary">
                <Button variant="outline" size="sm">
                  <Calculator className="w-4 h-4 mr-1" />
                  Расчёт зарплат (бухгалтерия)
                </Button>
              </Link>
            </div>
          )}

          {/* Ошибка сохранения */}
          {saveError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              {saveError}
            </div>
          )}

          {canChangePosition && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Филиал */}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground">Филиал</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedBranch}
                      onValueChange={(v) => setSelectedBranch(v as BranchId)}
                      disabled={(!hasAllBranchesAccess && allowedBranches.length <= 1) || isEditMode}
                    >
                      <SelectTrigger className="flex-1 h-9 bg-card text-sm min-w-0">
                        <SelectValue className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        {(hasAllBranchesAccess ? BRANCHES : allowedBranches).map((branch) => {
                          const isConfigured = hasSpecificBranchConfig(branch.id);
                          return (
                            <SelectItem
                              key={branch.id}
                              value={branch.id}
                              className={isConfigured ? '' : 'text-muted-foreground'}
                            >
                              {branch.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {!isEditMode && (
                      <Link to={`/calculator/${selectedBranch}`}>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Должность */}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground">Должность</span>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={isEditMode && !!effectiveEmployeeId}>
                    <SelectTrigger className="w-full h-9 bg-card text-sm">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePositions.map((pos) => {
                        const isConfigured = hasSpecificConfig(selectedBranch, pos.id);
                        return (
                          <SelectItem
                            key={pos.id}
                            value={pos.id}
                            className={isConfigured ? '' : 'text-muted-foreground'}
                          >
                            {pos.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Сотрудник */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Сотрудник</span>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={handleEmployeeChange}
                  disabled={branchEmployeesQuery.isLoading}
                >
                  <SelectTrigger className="w-full h-9 bg-card text-sm">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENERIC_EMPLOYEE_VALUE}>
                      По должности
                    </SelectItem>
                    {branchEmployees.filter(e => e.name).map((emp) => (
                      <SelectItem key={emp.name} value={emp.name!}>
                        {emp.employee_name} — {emp.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Config source indicator */}
                {effectiveEmployeeId && (
                  <span className={`text-[10px] ${hasEmployeeOverride ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {hasEmployeeOverride ? 'Индивидуальная настройка' : 'Используется настройка по должности'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit mode: config fields */}
        {isEditMode && editConfig && (
          <div className="bg-card rounded-2xl p-3 shadow-card border-0 mb-3 space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              {effectiveEmployeeId ? 'Индивидуальные настройки' : 'Настройки должности'}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Оклад</span>
                <Input
                  type="number"
                  value={editConfig.baseSalary}
                  onChange={e => handleBaseSalaryChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Личный план</span>
                <Input
                  type="number"
                  value={editConfig.personalPlan}
                  onChange={e => handlePersonalPlanChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">План клуба</span>
                <Input
                  type="number"
                  value={editConfig.clubPlan}
                  onChange={e => handleClubPlanChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* KPI Editor */}
            <KPIEditor
              kpis={editConfig.kpis}
              onChange={handleKPIsChange}
              availableMetrics={enabledMetrics}
            />

            {/* Delete employee override button */}
            {effectiveEmployeeId && hasEmployeeOverride && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={deleteEmployeeOverride}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Удалить индивидуальную настройку
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* Calculator hidden in edit mode */}
          {!isEditMode && (
            <SalaryCalculator
              config={config}
              selectedKPIs={calculatorKPIs}
              onKPIChange={handleCalculatorKPIChange}
              onCalculationChange={handleCalculationChange}
              pendingCellClick={pendingCellClick}
              onCellClickProcessed={handleCellClickProcessed}
              autoResolvedKPIs={autoResolvedKPIs}
              axisMetricValues={{ managerMetric, clubMetric, managerMetricName, clubMetricName }}
              onForecastRequest={canForecast ? fetchForecast : undefined}
              isForecastLoading={isForecastLoading}
              forecastError={forecastError}
              forecastData={forecastData}
              branchId={selectedBranch}
            />
          )}

          {/* Matrix: always visible in edit mode, collapsible otherwise */}
          {isEditMode ? (
            <MotivationMatrix
              currentManagerLevel={calculatorResult?.managerLevel ?? forecastBreakdown.managerLevel}
              currentClubLevel={calculatorResult?.clubLevel ?? forecastBreakdown.clubLevel}
              personalFact={calculatorResult?.personalFact ?? config.personalPlan * 0.87}
              personalPlan={calculatorResult?.personalPlan ?? config.personalPlan}
              matchingCells={calculatorResult?.matchingCells}
              currentBonusPercent={calculatorResult?.currentBonusPercent}
              onCellClick={undefined}
              matrix={config.matrix}
              baseSalary={calculatorResult?.baseSalary ?? config.baseSalary}
              config={config}
              isEditMode={isEditMode}
              onMatrixChange={handleMatrixChange}
              onManagerLevelsChange={handleManagerLevelsChange}
              onClubLevelsChange={handleClubLevelsChange}
              onManagerAxisLabelChange={handleManagerAxisLabelChange}
              onClubAxisLabelChange={handleClubAxisLabelChange}
              onManagerLinkedMetricChange={handleManagerLinkedMetricChange}
              onClubLinkedMetricChange={handleClubLinkedMetricChange}
              availableMetrics={enabledMetrics}
            />
          ) : (
            <div className="bg-card rounded-2xl shadow-card border-0 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 sm:px-4 py-3 text-sm font-medium text-foreground"
                onClick={() => setIsMatrixOpen((v) => !v)}
              >
                Матрица премий
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isMatrixOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMatrixOpen && (
                <div className="px-3 sm:px-4 pb-3">
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
