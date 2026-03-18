import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { KPIInput } from './KPIInput';
import type { EmployeeWithCalc } from '@/hooks/useAdminSalary';

interface EmployeeSalaryRowProps {
  data: EmployeeWithCalc;
  onKPIChange: (employeeId: string, kpiId: string, value: string | number | null) => void;
  onBaseSalaryChange: (employeeId: string, value: number) => void;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ru-RU');
}

const HL = 'bg-emerald-50 dark:bg-emerald-950/30';
const HL_TOTAL = 'bg-emerald-100 dark:bg-emerald-950/50';
const BD = 'border-r border-border/50';

export const EmployeeSalaryRow = memo(function EmployeeSalaryRow({
  data,
  onKPIChange,
  onBaseSalaryChange,
}: EmployeeSalaryRowProps) {
  const { employee, config, breakdown } = data;
  const employeeId = employee.name || '';
  const hasTrackerData = data.managerPlan > 0 || data.managerFact > 0;

  const bonusAmount = breakdown
    ? (breakdown.bonusPercent / 100) * data.managerFact
    : 0;

  return (
    <tr className={`border-b hover:bg-muted/30 ${!hasTrackerData ? 'opacity-50' : ''}`}>
      {/* 1. Сотрудник */}
      <td className={`px-1 py-1 text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap ${BD}`} title={employee.employee_name || employeeId}>
        {employee.employee_name || employeeId}
      </td>

      {/* 2. Должность */}
      <td className={`px-1 py-1 text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap ${BD}`} title={employee.designation || ''}>
        {employee.designation || '—'}
      </td>

      {/* 3. План филиала */}
      <td className={`px-1 py-1 text-[11px] text-center whitespace-nowrap ${BD}`}>
        {data.branchPlan > 0 ? fmt(data.branchPlan) : '—'}
      </td>

      {/* 4. Факт филиала */}
      <td className={`px-1 py-1 text-[11px] text-center whitespace-nowrap ${BD}`}>
        {data.branchFact > 0 ? fmt(data.branchFact) : '—'}
      </td>

      {/* 5. % филиала */}
      <td className={`px-1 py-1 text-[11px] text-center whitespace-nowrap ${BD}`}>
        {data.branchPercent > 0 ? `${data.branchPercent.toFixed(1)}%` : '—'}
      </td>

      {/* 6. Личный план */}
      <td className={`px-1 py-1 text-[11px] text-center whitespace-nowrap ${BD}`}>
        {data.managerPlan > 0 ? fmt(data.managerPlan) : '—'}
      </td>

      {/* 7. Факт личный */}
      <td className={`px-1 py-1 text-[11px] text-center whitespace-nowrap ${BD}`}>
        {data.managerFact > 0 ? fmt(data.managerFact) : '—'}
      </td>

      {/* 8. % личный */}
      <td className={`px-1 py-1 text-[11px] text-center whitespace-nowrap ${BD}`}>
        {data.managerPercent > 0 ? `${data.managerPercent.toFixed(1)}%` : '—'}
      </td>

      {/* 9. % премии */}
      <td className={`px-1 py-1 text-[11px] text-center font-medium whitespace-nowrap ${BD}`}>
        {breakdown ? `${breakdown.bonusPercent}%` : '—'}
      </td>

      {/* 10. Премия ₽ (highlighted) */}
      <td className={`px-1 py-1 text-[11px] text-center font-medium whitespace-nowrap ${HL} ${BD}`}>
        {breakdown ? fmt(bonusAmount) : '—'}
      </td>

      {/* 11. Оклад (editable, highlighted) */}
      <td className={`px-1 py-1 ${HL} ${BD}`}>
        <Input
          type="number"
          className="h-6 w-full text-[11px] px-1"
          value={data.baseSalary || ''}
          onChange={(e) => {
            const val = e.target.value;
            onBaseSalaryChange(employeeId, val === '' ? 0 : parseInt(val.replace(/\D/g, ''), 10) || 0);
          }}
        />
      </td>

      {/* 12. KPI */}
      <td className={`px-1 py-1 ${BD}`}>
        <div className="flex flex-col gap-0.5">
          {config.kpis.map(kpi => (
            <KPIInput
              key={kpi.id}
              kpi={kpi}
              value={data.selectedKPIs[kpi.id]}
              onChange={(kpiId, val) => onKPIChange(employeeId, kpiId, val)}
            />
          ))}
        </div>
      </td>

      {/* 13. KPI ₽ (highlighted) */}
      <td className={`px-1 py-1 text-[11px] text-center font-medium whitespace-nowrap ${HL} ${BD}`}>
        {breakdown ? fmt(breakdown.kpiBonus) : '—'}
      </td>

      {/* 14. Итого (highlighted stronger) */}
      <td className={`px-1 py-1 text-xs font-bold text-center whitespace-nowrap ${HL_TOTAL} ${BD}`}>
        {breakdown ? fmt(breakdown.total) : '—'}
      </td>

      {/* 15. Расшифровка ЗП */}
      <td className="px-1 py-1 text-[11px] text-muted-foreground">
        {data.explanation || '—'}
      </td>
    </tr>
  );
});
