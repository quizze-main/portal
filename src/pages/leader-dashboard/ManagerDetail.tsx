import { useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft } from 'lucide-react';
import {
  FilterBar,
  EditModeControls,
  MissionCard,
} from '@/components/dashboard';
import { FilterPeriod } from '@/components/dashboard/FilterBar';
import { FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';
import { DraggableMetricsGrid } from '@/components/dashboard/DraggableMetricsGrid';
import { DailyFactCards } from '@/components/leader-dashboard/DailyFactCards';
import { FactStatusCard } from '@/components/dashboard/FactStatusCard';
import { useManagerDetailLayout } from '@/hooks/useManagerDetailLayout';
import { useManagerDetail } from '@/hooks/useManagerDetail';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { BranchManagerSelector } from '@/components/dashboard/BranchManagerSelector';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { useMission } from '@/hooks/useMission';
import { Spinner } from '@/components/Spinner';
import { DateRange } from 'react-day-picker';

// --- Date helpers (same as LeaderDashboardHome) ---

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function endOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfYear(d: Date): Date {
  const x = new Date(d.getFullYear(), 11, 31);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rangeForPeriod(p: FilterPeriod): DateRange {
  const t = todayStart();
  if (p === 'day') return { from: t, to: t };
  if (p === '3days') return { from: addDays(t, -2), to: t };
  if (p === 'month') return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: endOfMonth(t) };
  if (p === 'year') return { from: new Date(t.getFullYear(), 0, 1), to: endOfYear(t) };
  return { from: addDays(t, -29), to: t };
}

/** Derive YYYY-MM period from dateRange for manager-breakdown API */
function periodFromRange(dateRange: DateRange | undefined): string {
  const d = dateRange?.from || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getInitialBranchId(storeOptions: { store_id: string }[]): string {
  try {
    const saved = sessionStorage.getItem('leader-active-branches');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    }
  } catch { /* ignore */ }

  if (storeOptions.length > 0) return storeOptions[0].store_id;
  return '';
}

function getInitialBranchIdFromParams(searchParams: URLSearchParams, storeOptions: { store_id: string }[]): string {
  const urlStoreId = searchParams.get('store_id');
  if (urlStoreId) return urlStoreId;
  return getInitialBranchId(storeOptions);
}

export interface ManagerDetailContentProps {
  managerId?: string;
  /** Hide outer wrapper and back button (for sheet embedding) */
  embedded?: boolean;
  /** Called when user wants to go back */
  onBack?: () => void;
  /** Called when user switches to another manager */
  onManagerChange?: (newManagerId: string) => void;
}

export function ManagerDetailContent({
  managerId,
  embedded,
  onBack,
  onManagerChange,
}: ManagerDetailContentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { storeOptions } = useEmployee();

  // Branch selection state
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    () => getInitialBranchId(storeOptions),
  );

  // Filter state (same pattern as LeaderDashboardHome)
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => rangeForPeriod('month'));

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const savedLayoutRef = useRef<any>(null);

  // Mission
  const { missionText, saveMission } = useMission();
  const [missionDraft, setMissionDraft] = useState<string | null>(null);

  // Fact entry sheet
  const [factSheetOpen, setFactSheetOpen] = useState(false);
  const { metrics: allMetricConfigs } = useAdminDashboardMetrics();

  const storeIds = useMemo(() => selectedBranchId ? [selectedBranchId] : [], [selectedBranchId]);

  const period = periodFromRange(dateRange);

  const { employee, employees, metrics, loading, error } = useManagerDetail(managerId, storeIds, period);

  // Transform ManagerMetricItem[] → FullWidthKPIMetric[] for DraggableMetricsGrid
  const kpiMetrics: FullWidthKPIMetric[] = useMemo(() => {
    return metrics.map(m => ({
      id: m.id,
      name: m.name,
      current: m.fact ?? 0,
      plan: m.plan ?? 0,
      unit: m.unit,
      trend: 'stable' as const,
      status: m.status === 'neutral' ? 'warning' : m.status,
      color: m.color,
      forecastLabel: m.forecastLabel === 'remaining' ? 'forecast' : m.forecastLabel,
      // Derived fields for KPI card parity with dashboard
      reserve: m.reserve,
      reserveUnit: m.reserveUnit,
      loss: m.loss,
      forecast: m.forecast,
      forecastValue: m.forecastValue,
      forecastUnit: m.forecastUnit,
      predictedValue: m.predictedValue,
      predictedCompletion: m.predictedCompletion,
      dailyRate: m.dailyRate,
    }));
  }, [metrics]);

  // Metrics layout hook
  const metricIds = useMemo(() => kpiMetrics.map(m => m.id), [kpiMetrics]);
  const { layout, updateLayout, setColumnSpan, resetLayout } = useManagerDetailLayout(
    managerId || 'default',
    metricIds,
  );

  const handlePeriodChange = useCallback((p: FilterPeriod) => {
    setFilterPeriod(p);
    setDateRange(rangeForPeriod(p));
  }, []);

  const handleToggleEdit = () => {
    if (!isEditMode) {
      savedLayoutRef.current = { ...layout };
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveLayout = () => {
    if (missionDraft !== null) {
      void saveMission(missionDraft);
    }
    savedLayoutRef.current = null;
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    if (savedLayoutRef.current) {
      updateLayout(savedLayoutRef.current.items);
    }
    setMissionDraft(null);
    setIsEditMode(false);
  };

  const handleResetLayout = () => {
    resetLayout();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
  };

  const handleManagerChange = (newManagerId: string) => {
    if (onManagerChange) {
      onManagerChange(newManagerId);
    } else {
      navigate(`/dashboard/manager/${newManagerId}`, { replace: true });
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  // Build manager options for selector
  const selectorManagers = useMemo(() => {
    return employees.map(e => ({
      id: e.name || '',
      name: e.employee_name,
      avatar: e.image,
      designation: e.designation,
    }));
  }, [employees]);

  const displayName = employee?.employee_name || 'Менеджер';
  const displayRole = employee?.designation || '';

  const content = (
    <>
      {/* Header */}
      <div className={embedded ? "px-4 pt-2 pb-2" : "px-4 pt-6 pb-2"}>
        <div className="flex items-center gap-3 mb-3">
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
          <Avatar className="w-12 h-12">
            <AvatarImage src={managerId ? `/api/frappe/employees/${encodeURIComponent(managerId)}/image${employee?.image ? `?v=${encodeURIComponent(employee.image)}` : ''}` : undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{displayRole}</p>
          </div>
        </div>

        {/* Branch & Manager Selectors */}
        <BranchManagerSelector
          branches={storeOptions}
          managers={selectorManagers}
          currentBranchId={selectedBranchId}
          currentManagerId={managerId || ''}
          onBranchChange={handleBranchChange}
          onManagerChange={handleManagerChange}
          managersLoading={loading}
        />

        {/* Fact Status — compact row under profile */}
        {!loading && (
          <div className="mt-2">
            <FactStatusCard
              storeId={selectedBranchId}
              metrics={allMetricConfigs}
              onOpen={() => setFactSheetOpen(true)}
            />
          </div>
        )}

        {/* FilterBar — same as LeaderDashboardHome */}
        <div className="mt-2">
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
      </div>

      <div className="px-4 space-y-4 pb-24">
        {/* Mission Card */}
        <MissionCard
          missionText={missionText}
          isEditMode={isEditMode}
          editDraft={missionDraft ?? undefined}
          onEditDraftChange={setMissionDraft}
        />

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="xl" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* KPI Metrics with Drag & Drop */}
        {!loading && kpiMetrics.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground px-1">Показатели</h2>
            <DraggableMetricsGrid
              metrics={kpiMetrics}
              isEditMode={isEditMode}
              layoutItems={layout.items}
              onLayoutChange={updateLayout}
              onColumnSpanChange={setColumnSpan}
            />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && kpiMetrics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Нет данных по этому менеджеру</p>
          </div>
        )}
      </div>

      {/* Fact Entry Sheet */}
      <Sheet open={factSheetOpen} onOpenChange={(open) => {
        setFactSheetOpen(open);
        if (!open) queryClient.invalidateQueries({ queryKey: ['fact-history'] });
      }}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-base">Заполнить факт</SheetTitle>
          </SheetHeader>
          {factSheetOpen && (
            <DailyFactCards
              metrics={allMetricConfigs}
              branches={storeOptions}
              defaultBranchId={selectedBranchId}
              onClose={() => setFactSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );

  if (embedded) return content;

  return (
    <div className="leader-dashboard-theme min-h-screen bg-gradient-main">
      {content}
    </div>
  );
}

/** Page wrapper — used by the route */
export default function ManagerDetail() {
  const { managerId } = useParams<{ managerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { storeOptions } = useEmployee();

  // Read initial branchId from URL params for the page route
  const [initialBranchId] = useState(() => getInitialBranchIdFromParams(searchParams, storeOptions));

  return <ManagerDetailContent managerId={managerId} />;
}
