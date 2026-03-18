import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { useEmployee } from "@/contexts/EmployeeProvider";
import {
  EditModeControls,
  FilterBar,
  BranchRankingTable,
  type BranchOption,
  ManagerRankingTable,
  type FilterPeriod,
  type FullWidthKPIMetric,
  MissionCard,
} from "@/components/dashboard";
import { DraggableFullWidthCard } from "@/components/dashboard/DraggableFullWidthCard";
import { cn } from "@/lib/utils";
import { useAdminDashboardMetrics } from "@/hooks/useAdminDashboardMetrics";
import { useMission } from "@/hooks/useMission";
import { useMetricsLayout, type MetricLayoutItem } from "@/hooks/useMetricsLayout";
import { DraggableSectionsList } from "./DraggableSectionsList";
import { DraggableSectionItem } from "./DraggableSectionItem";
import { getTopLeaderMetrics } from "@/lib/leaderDashboardApi";
import { readTtlCacheEntry, writeTtlCache } from "@/lib/storage";
import { getDashboardPositionCategory } from "@/lib/roleUtils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ClipboardEdit, MapPin, Target } from "lucide-react";
import { useWidgets } from "@/hooks/useWidgets";
import { ChartWidget } from "@/components/leader-dashboard/ChartWidget";
import { useQuery } from "@tanstack/react-query";
import { internalApiClient, type ChartWidgetConfig, type RankingWidgetConfig } from "@/lib/internalApiClient";
import { SetPlanSheet } from "./SetPlanSheet";
import { PlanFactSheet } from "./PlanFactSheet";
import { MetricDetailSheet } from "./MetricDetailSheet";
import { ManagerDetailSheet } from "./ManagerDetailSheet";
import { ReviewsSheet } from "./ReviewsSheet";
import { AttentionDealsSheet } from "./AttentionDealsSheet";
import { MetricQuickChart } from "./MetricQuickChart";
import { StaffingOverviewWidget } from "@/components/shift-schedule/StaffingOverviewWidget";
import { useShiftSchedule } from "@/hooks/useShiftSchedule";
import { useStaffingRequirements, useCoverage } from "@/hooks/useStaffingRequirements";

/**
 * Порт "1 в 1" главного дашборда из loovis-sandbox, но:
 * - без Layout/BottomNavigation (они уже есть в staff-focus-app)
 * - без переключателя режимов (включаем только лидерский режим)
 *
 * Важно: этот компонент должен отображаться ТОЛЬКО для руководителя клуба.
 */
export function LeaderDashboardHome() {
  const navigate = useNavigate();
  const { employee, storeId, setActiveStoreId, storeOptions, storeOptionsLoaded, canUseLeaderDashboard } = useEmployee();

  // Менеджер может вводить факты (но не ставить планы)
  const isManager = useMemo(
    () => Boolean(employee?.designation && /менеджер/i.test(employee.designation)),
    [employee?.designation],
  );
  const canOpenPlanSheet = canUseLeaderDashboard || isManager;

  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  const endOfMonth = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const endOfYear = (d: Date) => {
    const x = new Date(d.getFullYear(), 11, 31);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const rangeForPeriod = (p: FilterPeriod): DateRange => {
    const t = todayStart();
    if (p === "day") return { from: t, to: t };
    if (p === "3days") return { from: addDays(t, -2), to: t };
    // Важно: "месяц" и дефолт свободной даты — весь календарный месяц, не "с 1 по сегодня"
    if (p === "month") return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: endOfMonth(t) };
    if (p === "year") return { from: new Date(t.getFullYear(), 0, 1), to: endOfYear(t) };
    // 30 clients: use last 30 days as a reasonable default date range
    return { from: addDays(t, -29), to: t };
  };

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => rangeForPeriod("month"));

  // --- Branch multi-select ---
  const branches: BranchOption[] = useMemo(
    () =>
      (storeOptions || [])
        .filter((s) => Boolean(s?.store_id))
        .map((s) => ({ id: String(s.store_id), name: String(s.name || s.store_id) })),
    [storeOptions]
  );

  const branchesStorageKey = employee?.name ? `leaderDashboard.selectedBranches.${String(employee.name)}` : undefined;
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() => {
    if (!branchesStorageKey) return [];
    try {
      const raw = localStorage.getItem(branchesStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : undefined;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // ignore
    }
    return [];
  });

  const [branchesDropdownOpen, setBranchesDropdownOpen] = useState(false);
  const [branchDraftIds, setBranchDraftIds] = useState<string[]>([]);
  const [branchDraftDirty, setBranchDraftDirty] = useState(false);

  const effectiveSelectedBranchIds = useMemo(() => {
    const available = new Set(branches.map((b) => b.id));
    const normalized = Array.from(new Set(selectedBranchIds.map(String))).filter((id) => available.has(id));
    if (normalized.length > 0) return normalized;
    const fallback = storeId ? String(storeId) : "";
    if (fallback && available.has(fallback)) return [fallback];
    return branches.length > 0 ? [branches[0].id] : (storeId ? [String(storeId)] : []);
  }, [branches, selectedBranchIds, storeId]);

  const effectiveBranchDraftIds = useMemo(() => {
    const available = new Set(branches.map((b) => b.id));
    const normalized = Array.from(new Set(branchDraftIds.map(String))).filter((id) => available.has(id));
    return normalized;
  }, [branches, branchDraftIds]);

  const isMultiBranch = effectiveSelectedBranchIds.length > 1;

  const handleBranchesDropdownOpenChange = useCallback((open: boolean) => {
    setBranchesDropdownOpen(open);
    if (open) {
      setBranchDraftIds(effectiveSelectedBranchIds);
      setBranchDraftDirty(false);
      return;
    }
    setBranchDraftIds(effectiveSelectedBranchIds);
    setBranchDraftDirty(false);
  }, [effectiveSelectedBranchIds]);

  useEffect(() => {
    if (!branchesStorageKey) return;
    try {
      window.localStorage.setItem(branchesStorageKey, JSON.stringify(selectedBranchIds));
    } catch {
      // ignore
    }
  }, [branchesStorageKey, selectedBranchIds]);

  // Persist effective branch IDs to sessionStorage for ManagerDetail access
  useEffect(() => {
    try {
      sessionStorage.setItem('leader-active-branches', JSON.stringify(effectiveSelectedBranchIds));
    } catch {
      // ignore
    }
  }, [effectiveSelectedBranchIds]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [setPlanOpen, setSetPlanOpen] = useState(false);
  const [planFactOpen, setPlanFactOpen] = useState(false);
  const [metricDetailSheet, setMetricDetailSheet] = useState<{ open: boolean; metricId: string | null }>({ open: false, metricId: null });
  const [managerSheet, setManagerSheet] = useState<{ open: boolean; managerId: string | null }>({ open: false, managerId: null });
  const [reviewsSheetOpen, setReviewsSheetOpen] = useState(false);
  const [attentionDealsSheetOpen, setAttentionDealsSheetOpen] = useState(false);
  const [savedLayoutItems, setSavedLayoutItems] = useState<MetricLayoutItem[] | null>(null);
  const [savedRankingColumns, setSavedRankingColumns] = useState<{ branch?: string[]; manager?: string[] } | null>(null);
  const [savedSectionOrder, setSavedSectionOrder] = useState<string[] | null>(null);
  const [expandedInEdit, setExpandedInEdit] = useState<Set<string>>(new Set());

  const toggleExpandedInEdit = useCallback((widgetId: string) => {
    setExpandedInEdit(prev => {
      const next = new Set(prev);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return next;
    });
  }, []);

  // Mission text (shared across all users)
  const { missionText, saveMission } = useMission();
  const [missionDraft, setMissionDraft] = useState<string | null>(null);

  // Загружаем конфиг метрик из единого источника (dashboard-metrics.json)
  const { metrics: metricConfigs } = useAdminDashboardMetrics();
  const userPosition = getDashboardPositionCategory(employee?.designation);
  const enabledTopLevel = useMemo(
    () => metricConfigs
      .filter(m => m.enabled && !m.parentId)
      .filter(m => !m.visibleToPositions?.length || m.visibleToPositions.includes(userPosition))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [metricConfigs, userPosition],
  );

  // All enabled top-level metrics — available for rankings
  const rankingAvailableMetrics = useMemo(
    () => metricConfigs.filter(m => m.enabled && !m.parentId),
    [metricConfigs],
  );

  // Widgets (ranking tables etc.) from admin config
  const { widgets } = useWidgets();
  const enabledWidgets = useMemo(
    () => widgets
      .filter(w => w.enabled && !w.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [widgets],
  );

  // Нулевые метрики из конфига — реальные id/name/unit/color, но цифры = 0
  const buildZeroMetrics = useCallback((): FullWidthKPIMetric[] => {
    return enabledTopLevel.map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      current: 0,
      plan: 0,
      unit: cfg.unit,
      trend: 'stable' as const,
      status: 'warning' as const,
      color: cfg.color || '#3b82f6',
      forecastValue: 0,
      forecastUnit: cfg.forecastUnit || '%',
      forecastLabel: cfg.forecastLabel,
    }));
  }, [enabledTopLevel]);

  const [topMetrics, setTopMetrics] = useState<FullWidthKPIMetric[]>([]);
  const [topMetricsLoading, setTopMetricsLoading] = useState(false);

  // При загрузке конфига — инициализируем нулевыми метриками (если ещё нет данных)
  useEffect(() => {
    if (enabledTopLevel.length > 0) {
      setTopMetrics(prev => prev.length === 0 ? buildZeroMetrics() : prev);
    }
  }, [enabledTopLevel, buildZeroMetrics]);

  const formatYmd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Загрузка метрик для top widgets (config-driven, сохраняем существующую логику)
  useEffect(() => {
    let cancelled = false;

    // Нужно дождаться профиля + department_id (и storeId — он подтягивается отдельно)
    if (!employee?.department) return;

    const from = dateRange?.from ? formatYmd(dateRange.from) : undefined;
    const to = dateRange?.to ? formatYmd(dateRange.to) : undefined;
    // Используем effectiveSelectedBranchIds вместо одного storeId
    const allStoreIds = effectiveSelectedBranchIds.length > 0
      ? effectiveSelectedBranchIds
      : storeOptions.map((s) => s.store_id).filter(Boolean);
    const isAllBranches = effectiveSelectedBranchIds.length > 1 || effectiveSelectedBranchIds.length === 0;
    const ttlMs = 5 * 60 * 1000;
    const storeScope = isAllBranches
      ? `stores:${[...allStoreIds].sort().join(',')}`
      : `store:${String(effectiveSelectedBranchIds[0] ?? storeId ?? '')}`;
    const cacheKey = `leaderDashboard.topMetrics_v1:${String(employee.department)}:${storeScope}:${String(from ?? '')}:${String(to ?? '')}`;

    (async () => {
      try {
        setTopMetricsLoading(true);
        // SWR: if we have a cached metrics payload for the exact same filter, show it immediately
        const cached = readTtlCacheEntry<FullWidthKPIMetric[]>(cacheKey, ttlMs);
        if (cached?.data && cached.data.length > 0) {
          setTopMetrics(cached.data);
        } else {
          // При первом заходе на новый фильтр без кеша — показываем нули
          setTopMetrics(buildZeroMetrics());
        }
        const data = await getTopLeaderMetrics({
          date_from: from,
          date_to: to,
          department_id: employee.department,
          skipPositionFilter: true,
          ...(isAllBranches ? { store_ids: allStoreIds } : { store_id: effectiveSelectedBranchIds[0] ?? storeId ?? undefined }),
        });

        if (cancelled) return;

        // API уже возвращает полные данные (name, unit, color) из конфига
        const enriched = data.map((metric) => ({
          ...metric,
          color: metric.color ?? "#3b82f6",
        } as FullWidthKPIMetric));

        setTopMetrics(enriched);
        writeTtlCache(cacheKey, enriched);
      } catch (e) {
        if (cancelled) return;

        console.error("Failed to load leader dashboard metrics; showing zeros", e);
      } finally {
        if (!cancelled) setTopMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employee?.department, storeId, storeOptions, effectiveSelectedBranchIds, dateRange?.from, dateRange?.to, buildZeroMetrics]);

  // Layout hook for drag & drop
  const metricIds = useMemo(() => topMetrics.map((m) => m.id), [topMetrics]);
  const { layout, updateLayout, setColumnSpan, setRankingColumns, updateSectionOrder, resetLayout, saveNow } = useMetricsLayout(metricIds, { persistMode: 'manual' });

  const handleTopMetricClick = (metric: FullWidthKPIMetric) => {
    if (isEditMode) return;
    if (metric.id === "csi") {
      setReviewsSheetOpen(true);
      return;
    }
    if (metric.id === "revenue_closed") {
      setAttentionDealsSheetOpen(true);
      return;
    }
    setMetricDetailSheet({ open: true, metricId: metric.id });
  };

  const handleToggleEdit = useCallback(() => {
    if (!isEditMode) {
      setSavedLayoutItems([...layout.items]);
      setSavedRankingColumns(layout.rankingColumns ? { ...layout.rankingColumns } : null);
      setSavedSectionOrder(layout.sectionOrder ? [...layout.sectionOrder] : null);
      setMissionDraft(null);
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, layout.items, layout.rankingColumns, layout.sectionOrder]);

  const handleSaveLayout = useCallback(() => {
    // Save on explicit confirmation only (blue checkmark)
    void saveNow();
    if (missionDraft !== null) {
      void saveMission(missionDraft);
    }
    setSavedLayoutItems(null);
    setSavedRankingColumns(null);
    setSavedSectionOrder(null);
    setMissionDraft(null);
    setExpandedInEdit(new Set());
    setIsEditMode(false);
  }, [saveNow, missionDraft, saveMission]);

  const handleCancelEdit = useCallback(() => {
    if (savedLayoutItems) {
      updateLayout(savedLayoutItems);
    }
    // Restore ranking columns from snapshot
    if (savedRankingColumns !== null) {
      if (savedRankingColumns.branch) setRankingColumns('branch', savedRankingColumns.branch);
      if (savedRankingColumns.manager) setRankingColumns('manager', savedRankingColumns.manager);
    }
    // Restore section order
    if (savedSectionOrder !== null) {
      updateSectionOrder(savedSectionOrder);
    }
    setSavedLayoutItems(null);
    setSavedRankingColumns(null);
    setSavedSectionOrder(null);
    setMissionDraft(null);
    setExpandedInEdit(new Set());
    setIsEditMode(false);
  }, [savedLayoutItems, savedRankingColumns, savedSectionOrder, updateLayout, setRankingColumns, updateSectionOrder]);

  const handleResetLayout = useCallback(() => {
    resetLayout();
  }, [resetLayout]);

  const selectedStore = storeOptions.find((s) => s.store_id === storeId);
  const clubName = useMemo(() => {
    const total = branches.length;
    const selectedCount = effectiveSelectedBranchIds.length;
    if (total > 0 && selectedCount === total) return "Все филиалы";
    if (selectedCount === 1) return branches.find((b) => b.id === effectiveSelectedBranchIds[0])?.name || selectedStore?.name || employee?.department || "Клуб";
    if (total > 0) return `${selectedCount} из ${total}`;
    return selectedStore?.name || employee?.department || "Клуб";
  }, [branches, effectiveSelectedBranchIds, selectedStore?.name, employee?.department]);

  const dateFrom = dateRange?.from ? formatYmd(dateRange.from) : undefined;
  const dateTo = dateRange?.to ? formatYmd(dateRange.to) : undefined;

  // ── Staffing coverage data (for single branch only) ──
  const staffingBranchId = effectiveSelectedBranchIds.length === 1 ? effectiveSelectedBranchIds[0] : null;
  const staffingMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const { entries: staffingEntries } = useShiftSchedule(staffingBranchId, staffingMonth);
  const { requirements: staffingRequirements } = useStaffingRequirements(staffingBranchId);

  // Employees for coverage — reuse from store
  const staffingEmployeesQuery = useQuery({
    queryKey: ['staffingCoverageEmployees', staffingBranchId],
    queryFn: async () => {
      if (!staffingBranchId) return [];
      const store = storeOptions.find(s => s.store_id === staffingBranchId);
      if (!store?.department_id) return [];
      return internalApiClient.getEmployeesByStores({ departmentIds: [store.department_id] });
    },
    enabled: !!staffingBranchId,
    staleTime: 5 * 60_000,
  });

  const staffingCoverage = useCoverage(
    staffingMonth,
    staffingRequirements,
    staffingEntries,
    staffingEmployeesQuery.data || [],
  );

  const handlePeriodChange = useCallback((p: FilterPeriod) => {
    setFilterPeriod(p);
    setDateRange(rangeForPeriod(p));
    setTopMetrics(buildZeroMetrics());
  }, [buildZeroMetrics]);

  return (
    <div className="leader-dashboard-theme">
      <div className="max-w-7xl mx-auto">
        {/* Header (как в sandbox, но без toggle режима) */}
        <div className="px-3 lg:px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {canOpenPlanSheet && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 rounded-full"
                  onClick={() => setPlanFactOpen(true)}
                >
                  {canUseLeaderDashboard ? (
                    <>
                      <Target className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">План и факт</span>
                      <span className="sm:hidden">План</span>
                    </>
                  ) : (
                    <>
                      <ClipboardEdit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ввод факта</span>
                      <span className="sm:hidden">Факт</span>
                    </>
                  )}
                </Button>
              )}
              {storeOptions.length > 1 ? (
                <DropdownMenu open={branchesDropdownOpen} onOpenChange={handleBranchesDropdownOpenChange}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs gap-2 rounded-full bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-0 ring-0 min-w-[160px] justify-between"
                      title={clubName}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                        <span className="truncate">{clubName}</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80 p-2">
                    <div className="flex items-center justify-between px-1 pb-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-foreground hover:underline"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBranchDraftDirty(true);
                          const allIds = branches.map((b) => b.id);
                          const isAllSelected = effectiveBranchDraftIds.length === allIds.length && allIds.length > 0;
                          setBranchDraftIds(isAllSelected ? [] : allIds);
                        }}
                      >
                        {effectiveBranchDraftIds.length === branches.length && branches.length > 0 ? "Очистить все" : "Выбрать все"}
                      </button>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {effectiveBranchDraftIds.length} из {branches.length}
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-0.5">
                      {branches.map((b) => {
                        const checked = effectiveBranchDraftIds.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 text-left"
                            title={b.name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setBranchDraftDirty(true);
                              setBranchDraftIds((prev) => {
                                const available = new Set(branches.map((x) => x.id));
                                const current = Array.from(new Set(prev.map(String))).filter((id) => available.has(id));
                                if (current.includes(b.id)) {
                                  return current.filter((x) => x !== b.id);
                                }
                                return [...current, b.id];
                              });
                            }}
                          >
                            <Checkbox
                              checked={checked}
                              className="pointer-events-none"
                            />
                            <span className="text-xs text-foreground truncate">{b.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-2 border-t flex items-center justify-end gap-2 px-1">
                      {effectiveBranchDraftIds.length === 0 && (
                        <div className="mr-auto text-[11px] text-muted-foreground">
                          Выбери хотя бы 1 филиал
                        </div>
                      )}
                      <button
                        type="button"
                        className="h-7 px-3 rounded-full text-[11px] border border-border/60 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setBranchDraftIds(effectiveSelectedBranchIds);
                          setBranchDraftDirty(false);
                          setBranchesDropdownOpen(false);
                        }}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        disabled={effectiveBranchDraftIds.length === 0}
                        className={`h-7 px-3 rounded-full text-[11px] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => {
                          const next = effectiveBranchDraftIds;
                          if (next.length === 0) return;
                          setSelectedBranchIds(next);
                          if (next.length === 1) {
                            setActiveStoreId(next[0]);
                          }
                          setBranchDraftDirty(false);
                          setBranchesDropdownOpen(false);
                        }}
                      >
                        Сохранить
                      </button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <p className="text-sm text-muted-foreground">{clubName}</p>
              )}
            </div>
          </div>

          <FilterBar
            period={filterPeriod}
            onPeriodChange={handlePeriodChange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            editControls={
              <EditModeControls
                isEditMode={isEditMode}
                onToggleEdit={handleToggleEdit}
                onSave={handleSaveLayout}
                onCancel={handleCancelEdit}
                onReset={handleResetLayout}
              />
            }
          />
        </div>

        <div className="px-3 lg:px-6 pb-6 pt-2">
          <SectionsDnd
            sectionOrder={layout.sectionOrder}
            isEditMode={isEditMode}
            onReorder={updateSectionOrder}
            enabledWidgets={enabledWidgets}
            isMultiBranch={isMultiBranch}
            branchCount={branches.length}
            topMetrics={topMetrics}
            topMetricsLoading={topMetricsLoading}
            layoutItems={layout.items}
            onColumnSpanChange={setColumnSpan}
            onMetricClick={handleTopMetricClick}
            canOpenMetric={(m) => m.id === 'csi' || m.id === 'revenue_closed' || m.hasChildren === true}
            renderSection={(sectionId) => {
              // ── Mission ──
              if (sectionId === 'mission') {
                return (
                  <MissionCard
                    missionText={missionText}
                    isEditMode={isEditMode}
                    editDraft={missionDraft ?? undefined}
                    onEditDraftChange={setMissionDraft}
                  />
                );
              }

              // ── Staffing Coverage ──
              if (sectionId === 'staffing') {
                if (!staffingBranchId || staffingCoverage.length === 0) return null;
                return (
                  <StaffingOverviewWidget
                    coverageData={staffingCoverage}
                    month={staffingMonth}
                  />
                );
              }

              // ── Dynamic widgets ──
              const widget = enabledWidgets.find(w => w.id === sectionId);
              if (!widget) return null;

              const widgetExpanded = expandedInEdit.has(widget.id);

              if (widget.type === 'ranking') {
                const cfg = widget.config as RankingWidgetConfig;
                if (cfg.entityType === 'branch') {
                  if (!isMultiBranch || branches.length <= 1) return null;
                  if (isEditMode && !widgetExpanded) {
                    return <EditModeWidgetWrapper title={widget.name || 'Рейтинг филиалов'} widgetId={widget.id} isExpanded={false} onToggle={toggleExpandedInEdit} />;
                  }
                  const table = (
                    <BranchRankingTable
                      branches={branches}
                      selectedBranchIds={effectiveSelectedBranchIds}
                      departmentId={employee?.department}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      isEditMode={isEditMode}
                      visibleColumns={layout.rankingColumns?.branch || cfg.metricCodes}
                      onColumnsChange={(cols) => setRankingColumns('branch', cols)}
                      availableMetrics={rankingAvailableMetrics}
                      lossConfig={cfg.lossConfig}
                      forecastLabelOverrides={cfg.forecastLabelOverrides}
                      title={widget.name}
                    />
                  );
                  if (isEditMode) {
                    return <EditModeWidgetWrapper title={widget.name || 'Рейтинг филиалов'} widgetId={widget.id} isExpanded onToggle={toggleExpandedInEdit}>{table}</EditModeWidgetWrapper>;
                  }
                  return table;
                }
                if (cfg.entityType === 'manager') {
                  if (isEditMode && !widgetExpanded) {
                    return <EditModeWidgetWrapper title={widget.name || 'Рейтинг менеджеров'} widgetId={widget.id} isExpanded={false} onToggle={toggleExpandedInEdit} />;
                  }
                  const table = (
                    <ManagerRankingTable
                      period={filterPeriod}
                      dateRange={dateRange}
                      branches={branches}
                      selectedBranches={effectiveSelectedBranchIds}
                      isEditMode={isEditMode}
                      visibleColumns={layout.rankingColumns?.manager || cfg.metricCodes}
                      onColumnsChange={(cols) => setRankingColumns('manager', cols)}
                      availableMetrics={rankingAvailableMetrics}
                      lossConfig={cfg.lossConfig}
                      forecastLabelOverrides={cfg.forecastLabelOverrides}
                      title={widget.name}
                      onManagerClick={(managerId) => setManagerSheet({ open: true, managerId })}
                    />
                  );
                  if (isEditMode) {
                    return <EditModeWidgetWrapper title={widget.name || 'Рейтинг менеджеров'} widgetId={widget.id} isExpanded onToggle={toggleExpandedInEdit}>{table}</EditModeWidgetWrapper>;
                  }
                  return table;
                }
              }

              if (widget.type === 'chart') {
                const cfg = widget.config as ChartWidgetConfig;
                if (cfg.isMetricSelector) {
                  const chart = (
                    <MetricQuickChart
                      metrics={enabledTopLevel}
                      storeIds={effectiveSelectedBranchIds}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      forceCollapsed={false}
                    />
                  );
                  if (isEditMode) {
                    if (!widgetExpanded) return <EditModeWidgetWrapper title={widget.name || 'График метрики'} widgetId={widget.id} isExpanded={false} onToggle={toggleExpandedInEdit} />;
                    return <EditModeWidgetWrapper title={widget.name || 'График метрики'} widgetId={widget.id} isExpanded onToggle={toggleExpandedInEdit}>{chart}</EditModeWidgetWrapper>;
                  }
                  return chart;
                }
                const chart = (
                  <ChartWidget
                    config={cfg}
                    title={widget.name}
                    storeIds={effectiveSelectedBranchIds}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    forceCollapsed={false}
                  />
                );
                if (isEditMode) {
                  if (!widgetExpanded) return <EditModeWidgetWrapper title={widget.name || 'График'} widgetId={widget.id} isExpanded={false} onToggle={toggleExpandedInEdit} />;
                  return <EditModeWidgetWrapper title={widget.name || 'График'} widgetId={widget.id} isExpanded onToggle={toggleExpandedInEdit}>{chart}</EditModeWidgetWrapper>;
                }
                return chart;
              }

              if (widget.type === 'metric_selector_chart') {
                const chart = (
                  <MetricQuickChart
                    metrics={enabledTopLevel}
                    storeIds={effectiveSelectedBranchIds}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    forceCollapsed={false}
                  />
                );
                if (isEditMode) {
                  if (!widgetExpanded) return <EditModeWidgetWrapper title={widget.name || 'График метрики'} widgetId={widget.id} isExpanded={false} onToggle={toggleExpandedInEdit} />;
                  return <EditModeWidgetWrapper title={widget.name || 'График метрики'} widgetId={widget.id} isExpanded onToggle={toggleExpandedInEdit}>{chart}</EditModeWidgetWrapper>;
                }
                return chart;
              }

              return null;
            }}
          />
        </div>
      </div>

      {canOpenPlanSheet && (
        <SetPlanSheet
          open={setPlanOpen}
          onOpenChange={setSetPlanOpen}
          metrics={enabledTopLevel}
          branches={storeOptions}
          defaultBranchId={effectiveSelectedBranchIds[0]}
          canSetPlan={canUseLeaderDashboard}
        />
      )}

      {canOpenPlanSheet && (
        <PlanFactSheet
          open={planFactOpen}
          onOpenChange={setPlanFactOpen}
          defaultTab={canUseLeaderDashboard ? 'plan' : 'fact'}
        />
      )}

      <MetricDetailSheet
        open={metricDetailSheet.open}
        onOpenChange={(open) => setMetricDetailSheet(prev => ({ ...prev, open }))}
        metricId={metricDetailSheet.metricId}
        onManagerClick={(managerId) => setManagerSheet({ open: true, managerId })}
      />

      <ManagerDetailSheet
        open={managerSheet.open}
        onOpenChange={(open) => setManagerSheet({ open, managerId: open ? managerSheet.managerId : null })}
        managerId={managerSheet.managerId}
      />

      <ReviewsSheet
        open={reviewsSheetOpen}
        onOpenChange={setReviewsSheetOpen}
      />

      <AttentionDealsSheet
        open={attentionDealsSheetOpen}
        onOpenChange={setAttentionDealsSheetOpen}
      />
    </div>
  );
}

// ── Expandable widget wrapper for edit mode ──

function EditModeWidgetWrapper({ title, widgetId, isExpanded, onToggle, children }: {
  title: string;
  widgetId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(widgetId)}
        className="w-full p-3 flex items-center gap-2 cursor-pointer select-none hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {isExpanded ? 'Свернуть' : 'Развернуть'}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ── Section label map ──

const SECTION_LABELS: Record<string, string> = {
  mission: 'Миссия',
  staffing: 'Покрытие смен',
};

// ── Sections DnD orchestrator ──

const METRIC_PREFIX = 'metric:';

interface SectionsDndProps {
  sectionOrder?: string[];
  isEditMode: boolean;
  onReorder: (order: string[]) => void;
  enabledWidgets: Array<{ id: string; name: string; type: string; enabled: boolean; config: unknown }>;
  isMultiBranch: boolean;
  branchCount: number;
  topMetrics: FullWidthKPIMetric[];
  topMetricsLoading: boolean;
  layoutItems: MetricLayoutItem[];
  onColumnSpanChange: (metricId: string, span: 1 | 2) => void;
  onMetricClick: (metric: FullWidthKPIMetric) => void;
  canOpenMetric: (metric: FullWidthKPIMetric) => boolean;
  renderSection: (sectionId: string) => React.ReactNode;
}

function SectionsDnd({
  sectionOrder,
  isEditMode,
  onReorder,
  enabledWidgets,
  isMultiBranch,
  branchCount,
  topMetrics,
  topMetricsLoading,
  layoutItems,
  onColumnSpanChange,
  onMetricClick,
  canOpenMetric,
  renderSection,
}: SectionsDndProps) {
  // Build default order: mission, then individual metrics, then widgets
  const defaultOrder = useMemo(() => {
    const ids: string[] = ['mission'];
    // Individual metric IDs with prefix
    for (const m of topMetrics) {
      ids.push(METRIC_PREFIX + m.id);
    }
    for (const w of enabledWidgets) {
      if (w.type === 'ranking') {
        const cfg = w.config as RankingWidgetConfig;
        if (cfg.entityType === 'branch' && (!isMultiBranch || branchCount <= 1)) continue;
      }
      ids.push(w.id);
    }
    ids.push('staffing');
    return ids;
  }, [topMetrics, enabledWidgets, isMultiBranch, branchCount]);

  // Merge saved order with current available sections (+ migrate old 'metrics' group)
  const orderedSectionIds = useMemo(() => {
    if (!sectionOrder || sectionOrder.length === 0) return defaultOrder;
    const available = new Set(defaultOrder);
    const metricIds = topMetrics.map(m => METRIC_PREFIX + m.id);

    // Expand legacy 'metrics' entry into individual metric IDs
    let expanded = sectionOrder.flatMap(id => {
      if (id === 'metrics') return metricIds;
      return [id];
    });

    // Keep only sections that still exist
    const ordered = expanded.filter(id => available.has(id));
    // Append any new sections not in saved order
    for (const id of defaultOrder) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [sectionOrder, defaultOrder, topMetrics]);

  // Labels for drag handles
  const getLabel = (id: string) => {
    if (SECTION_LABELS[id]) return SECTION_LABELS[id];
    if (id.startsWith(METRIC_PREFIX)) {
      const metricId = id.slice(METRIC_PREFIX.length);
      const m = topMetrics.find(m => m.id === metricId);
      return m?.name || metricId;
    }
    const w = enabledWidgets.find(w => w.id === id);
    return w?.name || id;
  };

  const getColumnSpan = (metricId: string): 1 | 2 => {
    const item = layoutItems.find(i => i.id === metricId);
    return item?.columnSpan ?? 2;
  };

  // Group consecutive metrics into visual rows for grid layout
  const renderItems = () => {
    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < orderedSectionIds.length) {
      const sectionId = orderedSectionIds[i];

      // Collect consecutive metric items into a grid group
      if (sectionId.startsWith(METRIC_PREFIX)) {
        const groupStart = i;
        const metricGroup: string[] = [];
        while (i < orderedSectionIds.length && orderedSectionIds[i].startsWith(METRIC_PREFIX)) {
          metricGroup.push(orderedSectionIds[i]);
          i++;
        }

        // Render each metric as a DraggableSectionItem, wrapped in a grid
        const gridItems = metricGroup.map(mId => {
          const metricId = mId.slice(METRIC_PREFIX.length);
          const metric = topMetrics.find(m => m.id === metricId);
          if (!metric) return null;
          const colSpan = getColumnSpan(metricId);
          return (
            <DraggableSectionItem
              key={mId}
              id={mId}
              isEditMode={isEditMode}
              label={getLabel(mId)}
              className={cn(colSpan === 2 && "col-span-2")}
            >
              <DraggableFullWidthCard
                metric={metric}
                isEditMode={isEditMode}
                columnSpan={colSpan}
                onColumnSpanChange={(span) => onColumnSpanChange(metricId, span)}
                onClick={
                  !isEditMode && canOpenMetric(metric)
                    ? () => onMetricClick(metric)
                    : undefined
                }
              />
            </DraggableSectionItem>
          );
        });

        result.push(
          <div key={`metrics-group-${groupStart}`} className={cn(
            "grid grid-cols-2 gap-2",
            "md:grid-cols-3 md:gap-3",
            "lg:grid-cols-4 lg:gap-4",
            "xl:grid-cols-5",
            "2xl:grid-cols-6",
          )}>
            {gridItems}
          </div>
        );

        // Show loading indicator after first metrics group
        if (topMetricsLoading && groupStart === orderedSectionIds.findIndex(id => id.startsWith(METRIC_PREFIX))) {
          result.push(
            <div key="metrics-loading" className="pt-2 text-xs text-muted-foreground">
              Загружаю метрики…
            </div>
          );
        }

        continue;
      }

      // Non-metric section
      const content = renderSection(sectionId);
      if (content !== null) {
        result.push(
          <DraggableSectionItem
            key={sectionId}
            id={sectionId}
            isEditMode={isEditMode}
            label={getLabel(sectionId)}
          >
            <section className="animate-in fade-in duration-300">
              {content}
            </section>
          </DraggableSectionItem>
        );
      }
      i++;
    }

    return result;
  };

  return (
    <DraggableSectionsList
      sectionIds={orderedSectionIds}
      isEditMode={isEditMode}
      onReorder={onReorder}
    >
      {renderItems()}
    </DraggableSectionsList>
  );
}
