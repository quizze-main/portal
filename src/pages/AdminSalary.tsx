import { useAdminSalary } from '@/hooks/useAdminSalary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EmployeeSalaryRow } from '@/components/admin-salary/EmployeeSalaryRow';
import { SalarySummary } from '@/components/admin-salary/SalarySummary';
import { SessionHistory } from '@/components/admin-salary/SessionHistory';
import { generateSalaryCsv, downloadCsv } from '@/lib/salaryExport';
import { getBranchName } from '@/data/branchData';
import { Calculator, ChevronLeft, History, Loader2 } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

/** Column definitions for the salary table */
const SALARY_COLUMNS = [
  { label: 'Сотрудник', fullLabel: 'Сотрудник', defaultWidth: 130, minWidth: 80 },
  { label: 'Должность', fullLabel: 'Должность', defaultWidth: 90, minWidth: 60 },
  { label: 'План фил.', fullLabel: 'План филиала', defaultWidth: 78, minWidth: 55, center: true },
  { label: 'Факт фил.', fullLabel: 'Факт филиала', defaultWidth: 78, minWidth: 55, center: true },
  { label: '% фил.', fullLabel: '% филиала', defaultWidth: 52, minWidth: 40, center: true },
  { label: 'Личн. план', fullLabel: 'Личный план', defaultWidth: 78, minWidth: 55, center: true },
  { label: 'Факт личн.', fullLabel: 'Факт личный', defaultWidth: 78, minWidth: 55, center: true },
  { label: '% личн.', fullLabel: '% личный', defaultWidth: 52, minWidth: 40, center: true },
  { label: '% прем.', fullLabel: '% премии', defaultWidth: 52, minWidth: 40, center: true },
  { label: 'Премия', fullLabel: 'Премия ₽', defaultWidth: 72, minWidth: 50, center: true, hl: true },
  { label: 'Оклад', fullLabel: 'Оклад', defaultWidth: 80, minWidth: 60, center: true, hl: true },
  { label: 'KPI', fullLabel: 'KPI', defaultWidth: 115, minWidth: 80 },
  { label: 'KPI ₽', fullLabel: 'Выплата KPI ₽', defaultWidth: 62, minWidth: 45, center: true, hl: true },
  { label: 'Итого', fullLabel: 'Итого ₽', defaultWidth: 82, minWidth: 60, center: true, hlStrong: true },
  { label: 'Расшифровка ЗП', fullLabel: 'Расшифровка ЗП', defaultWidth: 200, minWidth: 100 },
];

const DEFAULT_WIDTHS = SALARY_COLUMNS.map(c => c.defaultWidth);

function getHlClass(col: typeof SALARY_COLUMNS[number]): string {
  if (col.hlStrong) return 'bg-emerald-100 dark:bg-emerald-950/50';
  if (col.hl) return 'bg-emerald-50 dark:bg-emerald-950/30';
  return '';
}

export default function AdminSalary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);

  // Column resize state
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS);
  const widthsRef = useRef<number[]>(DEFAULT_WIDTHS);

  const {
    selectedBranchId,
    setSelectedBranchId,
    selectedPeriod,
    setSelectedPeriod,
    branchFact,
    isLoadingBranchMetric,
    isLoadingManagerMetric,
    employeesWithCalc,
    isLoadingEmployees,
    setKPI,
    setBaseSalary,
    totals,
    sessions,
    isLoadingSessions,
    saveSession,
    isSaving,
    deleteSession,
    loadSession,
    buildSessionEmployees,
    branches,
  } = useAdminSalary();

  const isLoadingTrackerData = isLoadingBranchMetric || isLoadingManagerMetric;
  const totalWidth = colWidths.reduce((s, w) => s + w, 0);

  // Column resize handler
  const handleResizeStart = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthsRef.current[colIndex];
    const min = SALARY_COLUMNS[colIndex].minWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(min, startWidth + (ev.clientX - startX));
      const newWidths = [...widthsRef.current];
      newWidths[colIndex] = newWidth;
      widthsRef.current = newWidths;
      setColWidths(newWidths);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleExportCsv = () => {
    if (!selectedBranchId) return;
    const employees = buildSessionEmployees();
    if (employees.length === 0) return;
    const csv = generateSalaryCsv(selectedBranchId, selectedPeriod, employees);
    const branchName = getBranchName(selectedBranchId) || selectedBranchId;
    downloadCsv(csv, `salary_${branchName}_${selectedPeriod}.csv`);
  };

  const handleSave = async () => {
    try {
      await saveSession();
      toast({ title: 'Сохранено', description: 'Расчёт успешно сохранён' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  const handleLoadSession = async (id: string) => {
    await loadSession(id);
    setShowHistory(false);
    toast({ title: 'Загружено', description: 'Расчёт загружен из истории' });
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    toast({ title: 'Удалено' });
  };

  const fmt = (v: number) => Math.round(v).toLocaleString('ru-RU');

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Calculator className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Расчёт зарплат</h1>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-1" />
            История
          </Button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="mb-6 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-2">Сохранённые расчёты</h2>
            <SessionHistory
              sessions={sessions}
              isLoading={isLoadingSessions}
              onLoad={handleLoadSession}
              onDelete={handleDeleteSession}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end mb-6 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label className="text-xs">Филиал</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Выберите филиал" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Период</Label>
            <Input
              type="month"
              className="w-40"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            />
          </div>

          {/* Branch summary: plan from config, fact from Tracker */}
          {selectedBranchId && employeesWithCalc.length > 0 && (
            <div className="flex gap-4 items-center text-sm">
              <div>
                <span className="text-muted-foreground text-xs">План филиала: </span>
                <span className="font-medium">{fmt(employeesWithCalc[0].branchPlan)} ₽</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Факт: </span>
                <span className="font-medium">{fmt(branchFact)} ₽</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Выполнение: </span>
                <span className="font-bold">{employeesWithCalc[0].branchPercent.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {isLoadingTrackerData && selectedBranchId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка данных из Tracker...
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoadingEmployees && (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка сотрудников...
          </div>
        )}

        {/* Empty state */}
        {!isLoadingEmployees && selectedBranchId && employeesWithCalc.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Сотрудники не найдены для выбранного филиала
          </div>
        )}

        {/* No branch selected */}
        {!selectedBranchId && (
          <div className="text-center py-8 text-muted-foreground">
            Выберите филиал для начала работы
          </div>
        )}

        {/* Employee table */}
        {employeesWithCalc.length > 0 && (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table
              className="table-fixed w-full"
              style={{ minWidth: totalWidth }}
            >
              <colgroup>
                {colWidths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/50">
                  {SALARY_COLUMNS.map((col, i) => {
                    const hlClass = getHlClass(col);
                    const isLast = i === SALARY_COLUMNS.length - 1;
                    return (
                      <th
                        key={i}
                        className={`relative px-1 py-1.5 text-[11px] select-none ${col.hlStrong ? 'font-bold' : 'font-medium'} ${col.center ? 'text-center' : ''} ${hlClass} ${!isLast ? 'border-r border-border/50' : ''}`}
                        title={col.fullLabel}
                      >
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis block pr-1">
                          {col.label}
                        </span>
                        {/* Resize handle */}
                        {!isLast && (
                          <div
                            className="absolute top-0 -right-[3px] w-[6px] h-full cursor-col-resize z-10 hover:bg-primary/40 active:bg-primary/60"
                            onMouseDown={(e) => handleResizeStart(i, e)}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employeesWithCalc.map((data) => (
                  <EmployeeSalaryRow
                    key={data.employee.name}
                    data={data}
                    onKPIChange={setKPI}
                    onBaseSalaryChange={setBaseSalary}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <SalarySummary
          totals={totals}
          employeeCount={employeesWithCalc.filter(e => e.breakdown).length}
          onExportCsv={handleExportCsv}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
