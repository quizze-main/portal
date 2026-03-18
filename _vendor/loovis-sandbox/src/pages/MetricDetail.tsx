import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, ChevronRight } from 'lucide-react';
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
  RevenueZzManagersBlock,
  RevenueZzLossCard,
  RevenueZzRankingTable,
  MissionKPIGrid,
  MissionChartBlock,
  MissionAgeSegments,
  MissionRankingTable,
  RepairsLossCard,
  RepairsRankingTable,
  type FullWidthKPIMetric,
  type ManagerShiftData,
  type ConversionDetailData
} from '@/components/dashboard';
import { ConversionCompactBlock } from '@/components/dashboard/ConversionCompactBlock';
import { ConversionChartBlock } from '@/components/dashboard/ConversionChartBlock';
import { ConversionLossCard } from '@/components/dashboard/ConversionLossCard';
import { ConversionRankingTable } from '@/components/dashboard/ConversionRankingTable';
import { MarginChartBlock } from '@/components/dashboard/MarginChartBlock';
import { MarginLossCard } from '@/components/dashboard/MarginLossCard';
import { MarginCategoriesAccordion } from '@/components/dashboard/MarginCategoriesAccordion';
import { MarginRankingTable } from '@/components/dashboard/MarginRankingTable';
import { RepairsChartBlock } from '@/components/dashboard/RepairsChartBlock';
import { conversionsByPeriod, conversionSummaryByPeriod } from '@/data/conversionData';
import { 
  marginChartDataByPeriod, 
  marginManagersForChartByPeriod,
  marginStatsByPeriod 
} from '@/data/marginData';
import { ExpandableStatsRow } from '@/components/dashboard/ExpandableStatsRow';
import { CategoryTable } from '@/components/dashboard/CategoryTable';
import { useManagerMetricsLayout } from '@/hooks/useManagerMetricsLayout';
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
  revenueZzChartDataByPeriod,
  revenueZzManagersByPeriod,
  revenueZzStatsByPeriod,
  missionKPIsByPeriod,
  missionChartDataByPeriod,
  missionManagersForChartByPeriod,
  missionAgeSegmentsByPeriod,
  repairsChartDataByPeriod,
  repairsLossByPeriod,
  repairsManagersForChartByPeriod,
} from '@/data/periodData';

export default function MetricDetail() {
  const { metricId } = useParams<{ metricId: string }>();
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 11, 1),
    to: new Date(2024, 11, 31)
  });
  const [selectedManagerMetric, setSelectedManagerMetric] = useState('revenue_sz');

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

  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-main">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="px-4 lg:px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-foreground">{metric.name}</h1>
                <p className="text-sm text-muted-foreground">Декомпозиция по менеджерам</p>
              </div>
            </div>
            
            {/* Filter Bar - same as main dashboard */}
            <FilterBar
              period={filterPeriod}
              onPeriodChange={setFilterPeriod}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              editControls={
                <EditModeControls
                  isEditMode={isManagerMetricsEditMode}
                  onToggleEdit={handleToggleEdit}
                  onSave={handleSaveLayout}
                  onCancel={handleCancelEdit}
                  onReset={handleResetLayout}
                />
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
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
                <LossBreakdownCard
                  totalLoss={currentLossData.totalLoss}
                  employeeLoss={currentLossData.employeeLoss}
                  conversionLoss={currentLossData.conversionLoss}
                  arpcLoss={currentLossData.arpcLoss}
                />
                
                {/* Stats on desktop next to loss */}
                <div className="hidden lg:block">
                  <ExpandableStatsRow stats={currentStats} />
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
          {metricId === 'revenue_zz' && (() => {
            const revenueZzAttentionStats = {
              readyForPickup: { count: 12, amount: 156800 },
              storageExpired: { count: 20, amount: 252200 },
              deadlineSoon: { count: 5, amount: 51370 },
              overdue: { count: 6, amount: 65319 },
              total: { count: 43, amount: 525689 }
            };
            
            const formatFull = (value: number, suffix: string = ''): string => {
              return value.toLocaleString('ru-RU') + (suffix ? ` ${suffix}` : '');
            };

            return (
              <>
                {/* Chart + Managers Block */}
                <RevenueZzManagersBlock
                  current={metric.current}
                  plan={metric.plan}
                  chartData={revenueZzChartDataByPeriod[filterPeriod]}
                  status={metric.status}
                  managers={revenueZzManagersByPeriod[filterPeriod]}
                  onManagerClick={handleManagerClick}
                />

                {/* Requires Attention Widget */}
                <button 
                  onClick={() => navigate('/require-attention')}
                  className="w-full bg-gradient-to-r from-rose-100 to-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 hover:from-rose-200 hover:to-rose-100 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="text-xs text-rose-700 font-semibold whitespace-nowrap">
                        Требует внимания
                      </span>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {/* Готовы к выдаче */}
                      <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-emerald-600">
                          {revenueZzAttentionStats.readyForPickup.count}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Готовы</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">к выдаче</span>
                        <span className="text-xs font-medium text-foreground mt-0.5">
                          {formatFull(revenueZzAttentionStats.readyForPickup.amount, '₽')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-orange-600">
                          {revenueZzAttentionStats.storageExpired.count}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Срок хранения</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">превышен</span>
                        <span className="text-xs font-medium text-foreground mt-0.5">
                          {formatFull(revenueZzAttentionStats.storageExpired.amount, '₽')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-orange-600">
                          {revenueZzAttentionStats.deadlineSoon.count}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Скоро дедлайн</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">&lt;2 дней</span>
                        <span className="text-xs font-medium text-foreground mt-0.5">
                          {formatFull(revenueZzAttentionStats.deadlineSoon.amount, '₽')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center text-center">
                        <span className="text-lg font-bold text-red-600">
                          {revenueZzAttentionStats.overdue.count}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Просрочен</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">&nbsp;</span>
                        <span className="text-xs font-medium text-foreground mt-0.5">
                          {formatFull(revenueZzAttentionStats.overdue.amount, '₽')}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-rose-400 shrink-0" />
                  </div>
                </button>

                {/* Loss Card */}
                <RevenueZzLossCard period={filterPeriod} />

                {/* Stats - Closings statistics */}
                <ExpandableStatsRow 
                  stats={revenueZzStatsByPeriod[filterPeriod].map(s => ({
                    id: s.id,
                    name: s.label,
                    label: s.label,
                    value: s.value,
                    plan: s.plan,
                    unit: s.unit,
                  }))} 
                />

                {/* Manager Ranking */}
                <RevenueZzRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
              </>
            );
          })()}

          {/* Clients Count specific view */}
          {metricId === 'clients_count' && (
            <>
              <ClientsChartBlock
                totalClients={metric.current}
                totalRevenue={clientsLossByPeriod[filterPeriod].factRevenue}
                chartData={clientsChartDataByPeriod[filterPeriod]}
                managers={clientsManagersByPeriod[filterPeriod]}
                onManagerClick={handleManagerClick}
              />

              <ClientsLossCard period={filterPeriod} />

              <ClientStructureCard period={filterPeriod} />

              <ClientsRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
            </>
          )}

          {/* Mission Diagnostics specific view */}
          {metricId === 'mission_diagnostics' && (
            <>
              {/* Mission KPI Grid */}
              <MissionKPIGrid kpis={missionKPIsByPeriod[filterPeriod]} />

              {/* Chart Block */}
              <MissionChartBlock
                chartData={missionChartDataByPeriod[filterPeriod]}
                current={missionKPIsByPeriod[filterPeriod].diagnostics.current}
                plan={missionKPIsByPeriod[filterPeriod].diagnostics.plan}
                managers={missionManagersForChartByPeriod[filterPeriod]}
                onManagerClick={handleManagerClick}
              />

              {/* Age Segments */}
              <MissionAgeSegments
                segments={missionAgeSegmentsByPeriod[filterPeriod]}
                onManagerClick={handleManagerClick}
              />

              {/* Manager Ranking */}
              <MissionRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
            </>
          )}

          {/* Average Repair Price specific view */}
          {metricId === 'avg_repair_price' && (() => {
            // Get the repair metric data from leaderMetricsLevel1
            const repairMetric = leaderMetricsLevel1.find(m => m.id === 'avg_repair_price');
            const repairCurrent = repairMetric?.current ?? 2800;
            const repairPlan = repairMetric?.plan ?? 3200;
            
            return (
              <>
                {/* Chart Block with managers sidebar */}
                <RepairsChartBlock
                  chartData={repairsChartDataByPeriod[filterPeriod]}
                  current={repairCurrent}
                  plan={repairPlan}
                  managers={repairsManagersForChartByPeriod[filterPeriod]}
                  onManagerClick={handleManagerClick}
                  title="Динамика средней стоимости ремонта"
                />

                {/* Loss Card with breakdown */}
                <RepairsLossCard period={filterPeriod} />

                {/* Managers Ranking Table */}
                <RepairsRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
              </>
            );
          })()}

          {/* Conversion specific view */}
          {metricId === 'conversion' && (
            <>
              {/* Chart Block - Dynamics */}
              <ConversionChartBlock 
                period={filterPeriod}
                onManagerClick={handleManagerClick}
              />
              
              {/* Compact Conversion Block with inline details */}
              <ConversionCompactBlock 
                conversions={conversionsByPeriod[filterPeriod]} 
                summary={conversionSummaryByPeriod[filterPeriod]}
                onManagerClick={handleManagerClick}
              />
              
              {/* Ranking Table */}
              <ConversionRankingTable 
                period={filterPeriod}
                onManagerClick={handleManagerClick}
              />
            </>
          )}

          {/* Margin specific view */}
          {metricId === 'margin' && (() => {
            const marginStats = marginStatsByPeriod[filterPeriod];
            return (
              <>
                {/* Chart Block with managers sidebar */}
                <MarginChartBlock
                  chartData={marginChartDataByPeriod[filterPeriod]}
                  current={marginStats.current}
                  plan={marginStats.plan}
                  managers={marginManagersForChartByPeriod[filterPeriod]}
                  onManagerClick={handleManagerClick}
                  title="Динамика маржи"
                />

                {/* Loss Card */}
                <MarginLossCard period={filterPeriod} />

                {/* Categories Accordion */}
                <MarginCategoriesAccordion period={filterPeriod} />

                {/* Manager Ranking Table */}
                <MarginRankingTable period={filterPeriod} onManagerClick={handleManagerClick} />
              </>
            );
          })()}

          {/* Default view for other metrics */}
          {metricId !== 'revenue_sz' && metricId !== 'avg_glasses_price' && metricId !== 'revenue_zz' && metricId !== 'clients_count' && metricId !== 'mission_diagnostics' && metricId !== 'avg_repair_price' && metricId !== 'conversion' && metricId !== 'margin' && (
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
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}