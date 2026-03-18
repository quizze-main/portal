import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LeaderModeToggle } from '@/components/LeaderModeToggle';

import { 
  FilterBar,
  FilterPeriod,
  FullWidthKPIMetric,
  DraggableMetricsGrid,
  EditModeControls,
  ManagerRankingTable,
  OptometristRankingTable,
  MissionCard,
  BranchSelector,
  useBranchSelection,
  BranchRankingTable,
} from '@/components/dashboard';
import { missionMetric } from '@/data/mockData';
import {
  employeeMetricsByPeriodExtended,
} from '@/data/periodData';
import { aggregateBranchMetrics } from '@/data/branchMetricsData';

import { useMetricsLayout, MetricLayoutItem } from '@/hooks/useMetricsLayout';

export default function Dashboard() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 11, 1),
    to: new Date(2024, 11, 31)
  });
  const [isLeaderMode, setIsLeaderMode] = useState(true);
  
  // Branch selection
  const { selectedBranches, setSelectedBranches } = useBranchSelection();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [savedLayoutItems, setSavedLayoutItems] = useState<MetricLayoutItem[] | null>(null);

  // Select data based on mode and period
  const topMetrics = useMemo(() => {
    if (isLeaderMode) {
      // Aggregate metrics from selected branches
      return aggregateBranchMetrics(selectedBranches, filterPeriod);
    }
    return employeeMetricsByPeriodExtended[filterPeriod];
  }, [isLeaderMode, filterPeriod, selectedBranches]);

  // Layout hook for drag & drop
  const metricIds = useMemo(() => topMetrics.map(m => m.id), [topMetrics]);
  const { layout, updateLayout, setColumnSpan, resetLayout } = useMetricsLayout(metricIds);

  

  const handleTopMetricClick = (metric: FullWidthKPIMetric) => {
    if (isEditMode) return;
    if (metric.id === 'csi') {
      navigate('/reviews-detail');
      return;
    }
    navigate(`/dashboard/metric/${metric.id}`);
  };


  const handleToggleEdit = useCallback(() => {
    if (!isEditMode) {
      // Entering edit mode - save current state
      setSavedLayoutItems([...layout.items]);
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, layout.items]);

  const handleSaveLayout = useCallback(() => {
    setSavedLayoutItems(null);
    setIsEditMode(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (savedLayoutItems) {
      updateLayout(savedLayoutItems);
    }
    setSavedLayoutItems(null);
    setIsEditMode(false);
  }, [savedLayoutItems, updateLayout]);

  const handleResetLayout = useCallback(() => {
    resetLayout();
  }, [resetLayout]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="px-2 lg:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  {isLeaderMode ? 'Дашборд' : 'Мои показатели'}
                </h1>
                {isLeaderMode ? (
                  <BranchSelector
                    selectedBranches={selectedBranches}
                    onSelectionChange={setSelectedBranches}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Личный кабинет
                  </p>
                )}
              </div>
              <LeaderModeToggle 
                isLeaderMode={isLeaderMode} 
                onToggle={setIsLeaderMode} 
              />
            </div>

            {/* Unified Filter Bar */}
            <FilterBar
              period={filterPeriod}
              onPeriodChange={setFilterPeriod}
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

          <div className="px-2 lg:px-6 space-y-4 pb-24 pt-2">
            {/* Mission Card - Special diagnostic KPI */}
            {isLeaderMode && (
              <section className="animate-in fade-in duration-300">
                <MissionCard 
                  metric={missionMetric}
                  onClick={() => navigate('/dashboard/metric/mission_diagnostics')}
                />
              </section>
            )}

            {/* KPI Metrics Section */}
            <section key={filterPeriod} className="animate-in fade-in duration-300">
              <DraggableMetricsGrid
                metrics={topMetrics}
                isEditMode={isEditMode}
                layoutItems={layout.items}
                onLayoutChange={updateLayout}
                onColumnSpanChange={setColumnSpan}
                onMetricClick={isLeaderMode ? handleTopMetricClick : undefined}
              />
            </section>

            {/* Branch Ranking Table - only in leader mode with multiple branches */}
            {isLeaderMode && selectedBranches.length > 1 && (
              <section>
                <BranchRankingTable
                  period={filterPeriod}
                  selectedBranches={selectedBranches}
                  onBranchClick={(branchId) => {
                    // Filter dashboard to selected branch
                    setSelectedBranches([branchId]);
                  }}
                />
              </section>
            )}

            {/* Manager Ranking Table - only in leader mode */}
            {isLeaderMode && (
              <>
                <section>
                  <ManagerRankingTable 
                    period={filterPeriod}
                    onManagerClick={(managerId) => navigate(`/dashboard/manager/${managerId}`)}
                  />
                </section>
                
                <section>
                  <OptometristRankingTable 
                    period={filterPeriod}
                    onOptometristClick={(optometristId) => navigate(`/dashboard/optometrist/${optometristId}`)}
                  />
                </section>
              </>
            )}
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}
