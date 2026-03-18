import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ClipboardEdit, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/Spinner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { usePlanFactDashboard } from '@/hooks/usePlanFactDashboard';
import { useManagerBreakdown } from '@/hooks/useManagerBreakdown';
import { MONTH_NAMES_FULL, currentPeriod } from '@/lib/planFactUtils';
import { BranchDropdown } from '@/components/plan-fact/BranchDropdown';
import { PlanFactTable } from '@/components/plan-fact/PlanFactTable';
import { SetPlanSheet } from '@/components/leader-dashboard/SetPlanSheet';
import { DailyFactCards } from '@/components/leader-dashboard/DailyFactCards';
import { LeaderFactsOverview } from '@/components/leader-dashboard/LeaderFactsOverview';
import { FactHistoryBlock } from '@/components/leader-dashboard/FactHistoryBlock';

type PageTab = 'plan' | 'fact';

interface PlanFactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which tab to open by default */
  defaultTab?: PageTab;
}

export function PlanFactSheet({ open, onOpenChange, defaultTab = 'plan' }: PlanFactSheetProps) {
  const { canUseLeaderDashboard, storeOptions } = useEmployee();
  const { metrics, isLoading, isError, error } = useAdminDashboardMetrics();

  const [activeTab, setActiveTab] = useState<PageTab>(defaultTab);
  const [period, setPeriod] = useState(currentPeriod);
  const [selectedBranch, setSelectedBranch] = useState(() =>
    storeOptions.length > 1 ? '__all__' : storeOptions[0]?.store_id || '__all__',
  );
  const [planSheet, setPlanSheet] = useState<{ open: boolean; metricId?: string }>({ open: false });

  const dashboard = usePlanFactDashboard(period, storeOptions);

  const metricIds = useMemo(
    () => dashboard.metrics.map(m => m.id),
    [dashboard.metrics],
  );
  const managerBreakdown = useManagerBreakdown(
    selectedBranch,
    period,
    metricIds,
    selectedBranch !== '__all__',
  );

  const [periodYear, periodMonth] = period.split('-').map(Number);

  const prevPeriod = useCallback(() => {
    const m = periodMonth - 1;
    if (m < 1) setPeriod(`${periodYear - 1}-12`);
    else setPeriod(`${periodYear}-${String(m).padStart(2, '0')}`);
  }, [periodYear, periodMonth]);

  const nextPeriod = useCallback(() => {
    const m = periodMonth + 1;
    if (m > 12) setPeriod(`${periodYear + 1}-01`);
    else setPeriod(`${periodYear}-${String(m).padStart(2, '0')}`);
  }, [periodYear, periodMonth]);

  const handlePlanClick = useCallback((metricId: string) => {
    setPlanSheet({ open: true, metricId });
  }, []);

  const handlePlanSheetChange = useCallback((isOpen: boolean) => {
    setPlanSheet(prev => ({ ...prev, open: isOpen }));
  }, []);

  const enabledMetrics = metrics?.filter(m => m.enabled) || [];
  const factBranchId = selectedBranch !== '__all__' ? selectedBranch : storeOptions[0]?.store_id || '';

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
    }

    if (isError) {
      return (
        <Card className="mx-auto max-w-md p-6 text-center">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Не удалось загрузить метрики'}</p>
        </Card>
      );
    }

    if (enabledMetrics.length === 0) {
      return (
        <Card className="mx-auto max-w-md p-8 text-center">
          <ClipboardEdit className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Нет настроенных метрик</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Настроить можно в Админ-панели &rarr; Дашборд</p>
        </Card>
      );
    }

    return (
      <>
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted p-1 gap-1 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-colors ${
              activeTab === 'plan'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            План
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fact')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-colors ${
              activeTab === 'fact'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardEdit className="w-3.5 h-3.5" />
            Факт
          </button>
        </div>

        {activeTab === 'plan' && (
          <>
            {/* Period nav + Branch dropdown */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prevPeriod}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 min-w-[9rem] justify-center">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">{MONTH_NAMES_FULL[periodMonth - 1]} {periodYear}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={nextPeriod}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {storeOptions.length > 0 && (
                <BranchDropdown
                  branches={storeOptions}
                  branchHealth={dashboard.branchHealth}
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                />
              )}
            </div>

            {/* Main table */}
            {dashboard.isLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <PlanFactTable
                metrics={dashboard.metrics}
                coverageMatrix={dashboard.coverageMatrix}
                selectedBranchId={selectedBranch}
                allBranchIds={storeOptions.map(s => s.store_id)}
                canSetPlan={canUseLeaderDashboard}
                onPlanClick={handlePlanClick}
                period={period}
                managerData={managerBreakdown.data?.byMetric}
                managerDataLoading={managerBreakdown.isLoading}
              />
            )}
          </>
        )}

        {activeTab === 'fact' && (
          canUseLeaderDashboard && storeOptions.length > 1 ? (
            <LeaderFactsOverview
              metrics={enabledMetrics}
              branches={storeOptions}
              onClose={() => setActiveTab('plan')}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <DailyFactCards
                metrics={enabledMetrics}
                branches={storeOptions}
                defaultBranchId={factBranchId}
                onClose={() => setActiveTab('plan')}
              />
              <FactHistoryBlock
                storeId={factBranchId}
                days={14}
              />
            </div>
          )
        )}

        {/* SetPlanSheet — simplified mode */}
        {canUseLeaderDashboard && (
          <SetPlanSheet
            open={planSheet.open}
            onOpenChange={handlePlanSheetChange}
            metrics={enabledMetrics}
            branches={storeOptions}
            defaultBranchId={selectedBranch !== '__all__' ? selectedBranch : storeOptions[0]?.store_id}
            defaultMetricId={planSheet.metricId}
            defaultPeriod={period}
            simplified
            canSetPlan
          />
        )}
      </>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="text-base font-semibold">План / Факт</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
