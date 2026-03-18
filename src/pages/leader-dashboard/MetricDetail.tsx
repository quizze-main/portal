import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  KPISlider,
  ManagerKPIList,
  AttentionButton,
  FilterBar,
  FilterPeriod,
  KPIFullWidthCard,
  LossBreakdownCard,
  EditModeControls,
  RevenueManagersBlock,
  ConversionAccordion,
  AvgPriceRankingTable,
  AvgPriceChartBlock,
  AvgPriceCategoriesAccordion,
  AvgPriceLossCard,
  RevenueSzRankingTable,
  ClientsChartBlock,
  ClientStructureCard,
  ClientsRankingTable,
  LensMatrixCard,
  ClientsLossCard,
  DraggableMetricsGrid,
  type FullWidthKPIMetric,
  type ManagerShiftData,
  type ConversionDetailData
} from '@/components/dashboard';
import { ExpandableStatsRow } from '@/components/dashboard/ExpandableStatsRow';
import { CategoryTable } from '@/components/dashboard/CategoryTable';
import { ManagerRankingTable } from '@/components/dashboard/ManagerRankingTable';
import { BranchRankingTable } from '@/components/dashboard/BranchRankingTable';
import { useWidgets } from '@/hooks/useWidgets';
import type { RankingWidgetConfig, ChartWidgetConfig } from '@/lib/internalApiClient';
import { ChartWidget } from '@/components/leader-dashboard/ChartWidget';
import { MetricQuickChart } from '@/components/leader-dashboard/MetricQuickChart';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { useManagerMetricsLayout } from '@/hooks/useManagerMetricsLayout';
import { useMetricsLayout, type MetricLayoutItem } from '@/hooks/useMetricsLayout';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { getChildMetrics, type ChildMetricsResponse } from '@/lib/leaderDashboardApi';
import {
  metricDetailData,
  leaderMetricsLevel1,
  revenueSzCategories,
  revenueSzConversionsDetailed,
  revenueSzManagersDetail,
  avgPriceCategories,
  avgPriceLossBreakdown,
} from '@/data/mockData';
import {
  revenueSzChartDataByPeriod,
  avgPriceChartDataByPeriod,
  revenueSzConversionsByPeriod,
  revenueSzManagersByPeriod,
  revenueSzLossBreakdownByPeriod,
  revenueSzStatsByPeriodExtended,
  clientsChartDataByPeriod,
  clientsManagersByPeriod,
  clientsLossByPeriod,
} from '@/data/periodData';

export interface MetricDetailContentProps {
  metricId?: string;
  /** Called when user wants to go back; if omitted uses navigate(-1) */
  onBack?: () => void;
  /** Called when user clicks a manager; if omitted navigates to manager page */
  onManagerClick?: (managerId: string) => void;
  /** Hide the outer page wrapper (used when rendering inside a sheet) */
  embedded?: boolean;
}

export function MetricDetailContent({
  metricId,
  onBack,
  onManagerClick: onManagerClickProp,
  embedded,
}: MetricDetailContentProps) {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');

  // Date helpers (same logic as LeaderDashboardHome)
  const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
  const endOfMonth = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth() + 1, 0); x.setHours(0, 0, 0, 0); return x; };
  const endOfYear = (d: Date) => { const x = new Date(d.getFullYear(), 11, 31); x.setHours(0, 0, 0, 0); return x; };
  const rangeForPeriod = (p: FilterPeriod): DateRange => {
    const t = todayStart();
    if (p === 'day') return { from: t, to: t };
    if (p === '3days') return { from: addDays(t, -2), to: t };
    if (p === 'month') return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: endOfMonth(t) };
    if (p === 'year') return { from: new Date(t.getFullYear(), 0, 1), to: endOfYear(t) };
    return { from: addDays(t, -29), to: t };
  };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => rangeForPeriod('month'));

  const handlePeriodChange = useCallback((p: FilterPeriod) => {
    setFilterPeriod(p);
    setDateRange(rangeForPeriod(p));
  }, []);

  const [selectedManagerMetric, setSelectedManagerMetric] = useState('revenue_sz');

  const formatYmd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get stats based on selected period - use extended period data
  const currentStats = useMemo(() => {
    return revenueSzStatsByPeriodExtended[filterPeriod] || revenueSzStatsByPeriodExtended['month'];
  }, [filterPeriod]);
  
  // Get loss data based on period
  const currentLossData = useMemo(() => {
    return revenueSzLossBreakdownByPeriod[filterPeriod];
  }, [filterPeriod]);

  // Manager metrics layout for drag & drop
  const { metricsOrder, updateOrder, resetOrder } = useManagerMetricsLayout();
  const [isManagerMetricsEditMode, setIsManagerMetricsEditMode] = useState(false);
  const savedOrderRef = useRef<string[]>(metricsOrder);

  const handleToggleEdit = () => {
    if (!isManagerMetricsEditMode) {
      savedOrderRef.current = [...metricsOrder];
    }
    setIsManagerMetricsEditMode(!isManagerMetricsEditMode);
  };

  const handleSaveLayout = () => {
    savedOrderRef.current = [...metricsOrder];
    setIsManagerMetricsEditMode(false);
  };

  const handleCancelEdit = () => {
    updateOrder(savedOrderRef.current);
    setIsManagerMetricsEditMode(false);
  };

  const handleResetLayout = () => {
    resetOrder();
  };

  // Get metric detail from centralized data, or build from leaderMetricsLevel1
  const detailData = metricId && metricDetailData[metricId] 
    ? metricDetailData[metricId] 
    : null;

  // Fallback: find metric in level1 metrics
  const fallbackMetric = metricId 
    ? leaderMetricsLevel1.find(m => m.id === metricId) 
    : null;

  const metric = detailData?.metric || (fallbackMetric ? {
    id: fallbackMetric.id,
    name: fallbackMetric.name,
    current: fallbackMetric.current,
    plan: fallbackMetric.plan,
    reserve: fallbackMetric.reserve,
    forecast: fallbackMetric.forecast,
    unit: fallbackMetric.unit,
    status: fallbackMetric.status
  } : {
    id: 'default',
    name: 'Показатель',
    current: 75,
    plan: 100,
    forecast: 75,
    unit: '%' as const,
    status: 'warning' as const
  });

  const managers = detailData?.managers || [];

  // Transform managers for ManagerKPIList format
  const managersForList = managers.map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    metric: {
      id: metric.id,
      name: metric.name,
      level: 1 as const,
      current: m.current,
      plan: m.plan,
      forecast: m.forecast,
      unit: metric.unit,
      status: m.status,
      trend: 'stable' as const
    }
  }));

  // Transform managers for accordion
  const managersOnShift: ManagerShiftData[] = revenueSzManagersDetail.map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    createdOrders: m.createdOrders,
    createdOrdersPlan: m.createdOrdersPlan
  }));

  // --- Dynamic child metrics (for non-hardcoded metrics) ---
  const HARDCODED_METRICS = ['revenue_sz', 'avg_glasses_price', 'revenue_zz', 'clients_count'];
  const isHardcoded = metricId ? HARDCODED_METRICS.includes(metricId) : false;
  const { employee, storeId, storeOptions } = useEmployee();
  const { metrics: metricConfigs } = useAdminDashboardMetrics();
  const childMetricConfigs = useMemo(
    () => metricConfigs.filter(m => m.enabled && m.parentId === metricId),
    [metricConfigs, metricId],
  );

  // Branches for ranking widgets
  const branches = useMemo(
    () => (storeOptions || [])
      .filter(s => Boolean(s?.store_id))
      .map(s => ({ id: String(s.store_id), name: String(s.name || s.store_id) })),
    [storeOptions],
  );

  // Read branch filter from localStorage (same key as LeaderDashboardHome)
  const selectedBranchIds = useMemo(() => {
    const storageKey = employee?.name ? `leaderDashboard.selectedBranches.${String(employee.name)}` : undefined;
    if (!storageKey) return [] as string[];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : undefined;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* ignore */ }
    return [] as string[];
  }, [employee?.name]);

  const effectiveSelectedBranchIds = useMemo(() => {
    const available = new Set(branches.map(b => b.id));
    const normalized = Array.from(new Set(selectedBranchIds.map(String))).filter(id => available.has(id));
    if (normalized.length > 0) return normalized;
    const fallback = storeId ? String(storeId) : '';
    if (fallback && available.has(fallback)) return [fallback];
    return branches.length > 0 ? [branches[0].id] : (storeId ? [String(storeId)] : []);
  }, [branches, selectedBranchIds, storeId]);

  // Widgets assigned to this metric page
  const { widgets } = useWidgets();
  const pageWidgets = useMemo(
    () => widgets
      .filter(w => w.enabled && w.parentId === metricId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [widgets, metricId],
  );

  const [childData, setChildData] = useState<ChildMetricsResponse | null>(null);
  const [childLoading, setChildLoading] = useState(false);

  // Child metrics layout (drag-drop editor)
  const childMetricIds = useMemo(
    () => (childData?.children ?? []).map(c => c.id),
    [childData?.children]
  );

  const {
    layout: childLayout,
    updateLayout: updateChildLayout,
    setColumnSpan: setChildColumnSpan,
    resetLayout: resetChildLayout,
    saveNow: saveChildLayoutNow,
  } = useMetricsLayout(childMetricIds, { persistMode: 'manual' });

  const [isChildEditMode, setIsChildEditMode] = useState(false);
  const [savedChildLayoutItems, setSavedChildLayoutItems] = useState<MetricLayoutItem[] | null>(null);

  const handleChildToggleEdit = useCallback(() => {
    if (!isChildEditMode) {
      setSavedChildLayoutItems([...childLayout.items]);
    }
    setIsChildEditMode(!isChildEditMode);
  }, [isChildEditMode, childLayout.items]);

  const handleChildSaveLayout = useCallback(() => {
    void saveChildLayoutNow();
    setSavedChildLayoutItems(null);
    setIsChildEditMode(false);
  }, [saveChildLayoutNow]);

  const handleChildCancelEdit = useCallback(() => {
    if (savedChildLayoutItems) {
      updateChildLayout(savedChildLayoutItems);
    }
    setSavedChildLayoutItems(null);
    setIsChildEditMode(false);
  }, [savedChildLayoutItems, updateChildLayout]);

  const handleChildResetLayout = useCallback(() => {
    resetChildLayout();
  }, [resetChildLayout]);

  useEffect(() => {
    if (!metricId || isHardcoded || !employee?.department) return;

    let cancelled = false;
    (async () => {
      setChildLoading(true);
      try {
        const isMulti = effectiveSelectedBranchIds.length > 1;
        const result = await getChildMetrics(metricId, {
          date_from: dateRange?.from ? formatYmd(dateRange.from) : undefined,
          date_to: dateRange?.to ? formatYmd(dateRange.to) : undefined,
          department_id: employee.department,
          ...(isMulti
            ? { store_ids: effectiveSelectedBranchIds }
            : { store_id: effectiveSelectedBranchIds[0] ?? storeId ?? undefined }),
        });
        if (!cancelled) setChildData(result);
      } catch (err) {
        console.error('Failed to load child metrics', err);
        if (!cancelled) setChildData(null);
      } finally {
        if (!cancelled) setChildLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [metricId, isHardcoded, employee?.department, effectiveSelectedBranchIds, storeId, dateRange?.from, dateRange?.to]);

  const handleManagerClick = (managerId: string) => {
    if (onManagerClickProp) onManagerClickProp(managerId);
    else navigate(`/dashboard/manager/${managerId}`);
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const content = (
      <>
          {/* Header */}
          <div className={embedded ? "px-4 pt-2 pb-4" : "px-4 lg:px-6 pt-6 pb-4"}>
            <div className="flex items-center gap-3 mb-4">
              {!embedded && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-foreground">
                  {childData?.parent?.name || metric.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {childData?.children && childData.children.length > 0
                    ? 'Декомпозиция по подметрикам'
                    : 'Декомпозиция по менеджерам'}
                </p>
              </div>
            </div>
            
            {/* Filter Bar - same as main dashboard */}
            <FilterBar
              period={filterPeriod}
              onPeriodChange={handlePeriodChange}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              editControls={
                !isHardcoded && childData?.children && childData.children.length > 0
                  ? <EditModeControls
                      isEditMode={isChildEditMode}
                      onToggleEdit={handleChildToggleEdit}
                      onSave={handleChildSaveLayout}
                      onCancel={handleChildCancelEdit}
                      onReset={handleChildResetLayout}
                    />
                  : isHardcoded
                    ? <EditModeControls
                        isEditMode={isManagerMetricsEditMode}
                        onToggleEdit={handleToggleEdit}
                        onSave={handleSaveLayout}
                        onCancel={handleCancelEdit}
                        onReset={handleResetLayout}
                      />
                    : undefined
              }
            />
          </div>

          <div className="px-4 lg:px-6 space-y-4 lg:space-y-6 pb-24">
          {/* Revenue SZ specific view */}
          {metricId === 'revenue_sz' && (
            <>
              {/* Revenue Chart + Managers Block */}
              <RevenueManagersBlock
                current={metric.current}
                plan={metric.plan}
                chartData={revenueSzChartDataByPeriod[filterPeriod]}
                status={metric.status}
                managers={revenueSzManagersByPeriod[filterPeriod]}
                onManagerClick={handleManagerClick}
              />

              {/* Main KPI + Loss Breakdown - side by side on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <LossBreakdownCard
                  totalLoss={currentLossData.totalLoss}
                  employeeLoss={currentLossData.employeeLoss}
                  conversionLoss={currentLossData.conversionLoss}
                  arpcLoss={currentLossData.arpcLoss}
                />
                
                {/* Stats on desktop next to loss */}
                <div className="hidden lg:block">
                  <ExpandableStatsRow stats={currentStats} className="h-full" />
                </div>
              </div>

              {/* Main Stats Row - Mobile only */}
              <div className="lg:hidden">
                <ExpandableStatsRow stats={currentStats} />
              </div>

              {/* Conversions Accordion */}
              <ConversionAccordion conversions={revenueSzConversionsByPeriod[filterPeriod]} />

              {/* Manager Ranking */}
              <RevenueSzRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
            </>
          )}

          {/* Average Price specific view */}
          {metricId === 'avg_glasses_price' && (
            <>
              {/* Chart Block */}
              <AvgPriceChartBlock
                chartData={avgPriceChartDataByPeriod[filterPeriod]}
                current={metric.current}
                plan={metric.plan}
                title="Динамика средней стоимости"
              />

              {/* Lens Matrix Widget */}
              <LensMatrixCard period={filterPeriod} />

              {/* Categories Accordion with manager details */}
              <AvgPriceCategoriesAccordion period={filterPeriod} />

              {/* Loss Card - specific to avg price */}
              <AvgPriceLossCard period={filterPeriod} />

              {/* Managers Ranking Table */}
              <AvgPriceRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
            </>
          )}

          {/* Revenue ZZ specific view */}
          {metricId === 'revenue_zz' && (
            <>
              {/* Club Total - KPIFullWidthCard matching main dashboard */}
              <KPIFullWidthCard
                metric={{
                  id: metric.id,
                  name: metric.name,
                  current: metric.current,
                  plan: metric.plan,
                  unit: metric.unit,
                  trend: 'stable',
                  status: metric.status,
                  color: metric.status === 'good' ? 'hsl(var(--success))' : metric.status === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                  loss: metric.status === 'critical' ? Math.abs((metric.plan - metric.current) * 0.1) : undefined,
                  forecast: metric.forecast,
                  forecastValue: metric.forecast,
                  forecastUnit: metric.unit,
                  forecastLabel: 'forecast'
                } as FullWidthKPIMetric}
                showArrow={false}
              />

              {/* Attention Button - navigates to RequireAttention page */}
              <AttentionButton count={31} totalAmount={368889} />

              {managersForList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    По менеджерам
                  </h3>

                  <ManagerKPIList 
                    managers={managersForList}
                    onManagerClick={handleManagerClick}
                  />
                </div>
              )}
            </>
          )}

          {/* Clients Count specific view */}
          {metricId === 'clients_count' && (
            <>
              <ClientsChartBlock
                current={metric.current}
                plan={metric.plan}
                totalRevenue={clientsLossByPeriod[filterPeriod].factRevenue}
                revenuePlan={clientsLossByPeriod[filterPeriod].planRevenue}
                chartData={clientsChartDataByPeriod[filterPeriod]}
                status={metric.status}
                managers={clientsManagersByPeriod[filterPeriod]}
                onManagerClick={handleManagerClick}
              />

              <ClientsLossCard period={filterPeriod} />

              <ClientStructureCard period={filterPeriod} />

              <ClientsRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
            </>
          )}

          {/* Default view for other metrics */}
          {metricId !== 'revenue_sz' && metricId !== 'avg_glasses_price' && metricId !== 'revenue_zz' && metricId !== 'clients_count' && (
            <>
              {/* Dynamic child metrics view */}
              {childLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Загрузка подметрик…</span>
                </div>
              )}

              {!childLoading && childData?.parent && (
                <KPIFullWidthCard
                  metric={{
                    ...childData.parent,
                    color: childData.parent.status === 'good' ? 'hsl(var(--success))' : childData.parent.status === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                  } as FullWidthKPIMetric}
                  showArrow={false}
                />
              )}

              {!childLoading && childData?.children && childData.children.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Подметрики
                  </h3>
                  <DraggableMetricsGrid
                    metrics={childData.children.map(child => ({
                      ...child,
                      color: child.status === 'good' ? 'hsl(var(--success))' : child.status === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                    }))}
                    isEditMode={isChildEditMode}
                    layoutItems={childLayout.items}
                    onLayoutChange={updateChildLayout}
                    onColumnSpanChange={setChildColumnSpan}
                  />
                </div>
              )}

              {/* Fallback: no child metrics — show mock-based default */}
              {!childLoading && (!childData?.children || childData.children.length === 0) && !childData?.parent && (
                <>
                  <KPIFullWidthCard
                    metric={{
                      id: metric.id,
                      name: metric.name,
                      current: metric.current,
                      plan: metric.plan,
                      unit: metric.unit,
                      trend: 'stable',
                      status: metric.status,
                      color: metric.status === 'good' ? 'hsl(var(--success))' : metric.status === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                      loss: metric.status === 'critical' ? Math.abs((metric.plan - metric.current) * 0.1) : undefined,
                      forecast: metric.forecast,
                      forecastValue: metric.forecast,
                      forecastUnit: metric.unit,
                      forecastLabel: 'forecast'
                    } as FullWidthKPIMetric}
                    showArrow={false}
                  />

                  {managersForList.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        По менеджерам
                      </h3>

                      <ManagerKPIList
                        managers={managersForList}
                        onManagerClick={handleManagerClick}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Widgets assigned to this metric page */}
          {pageWidgets.map(widget => {
            if (widget.type === 'ranking') {
              const cfg = widget.config as RankingWidgetConfig;
              if (cfg.entityType === 'branch') {
                if (branches.length <= 1) return null;
                return (
                  <section key={widget.id} className="animate-in fade-in duration-300">
                    <BranchRankingTable
                      branches={branches}
                      selectedBranchIds={effectiveSelectedBranchIds}
                      departmentId={employee?.department}
                      dateFrom={dateRange?.from ? formatYmd(dateRange.from) : undefined}
                      dateTo={dateRange?.to ? formatYmd(dateRange.to) : undefined}
                      visibleColumns={cfg.metricCodes}
                      lossConfig={cfg.lossConfig}
                      title={widget.name}
                    />
                  </section>
                );
              }
              if (cfg.entityType === 'manager') {
                return (
                  <section key={widget.id} className="animate-in fade-in duration-300">
                    <ManagerRankingTable
                      period={filterPeriod}
                      dateRange={dateRange}
                      branches={branches}
                      selectedBranches={effectiveSelectedBranchIds}
                      lossConfig={cfg.lossConfig}
                      visibleColumns={cfg.metricCodes}
                      title={widget.name}
                    />
                  </section>
                );
              }
              return null;
            }
            if (widget.type === 'chart') {
              const cfg = widget.config as ChartWidgetConfig;
              const dateFrom = dateRange?.from ? formatYmd(dateRange.from) : undefined;
              const dateTo = dateRange?.to ? formatYmd(dateRange.to) : undefined;
              if (cfg.isMetricSelector) {
                return (
                  <section key={widget.id} className="animate-in fade-in duration-300">
                    <MetricQuickChart
                      metrics={childMetricConfigs}
                      storeIds={effectiveSelectedBranchIds}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                    />
                  </section>
                );
              }
              return (
                <section key={widget.id} className="animate-in fade-in duration-300">
                  <ChartWidget
                    config={cfg}
                    title={widget.name}
                    storeIds={effectiveSelectedBranchIds}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                </section>
              );
            }
            return null;
          })}
          </div>
      </>
  );

  if (embedded) return content;

  return (
    <div className="leader-dashboard-theme min-h-screen bg-gradient-main">
      <div className="max-w-7xl mx-auto">
        {content}
      </div>
    </div>
  );
}

/** Page wrapper — used by the route */
export default function MetricDetail() {
  const { metricId } = useParams<{ metricId: string }>();
  return <MetricDetailContent metricId={metricId} />;
}