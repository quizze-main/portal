import type { SalarySessionEmployee } from '@/types/salary-admin';
import { getBranchName } from '@/data/branchData';

export function generateSalaryCsv(
  branchId: string,
  period: string,
  employees: SalarySessionEmployee[]
): string {
  const BOM = '\uFEFF';
  const branchName = getBranchName(branchId) || branchId;

  const header = [
    'Сотрудник',
    'Должность',
    'План филиала',
    'Факт филиала',
    '% филиала',
    'План менеджера',
    'Факт МЗ',
    '% МЗ',
    '% премии',
    'KPI',
    'Выплата KPI',
    'Итого',
    'Разъяснение',
  ].join(';');

  const rows = employees.map(e => {
    const kpiList = Object.entries(e.selectedKPIs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return [
      e.employeeName,
      e.designation,
      Math.round(e.branchPlan),
      Math.round(e.branchFact),
      e.branchPercent.toFixed(1) + '%',
      Math.round(e.managerPlan),
      Math.round(e.managerFact),
      e.managerPercent.toFixed(1) + '%',
      e.bonusPercent + '%',
      kpiList || '—',
      Math.round(e.kpiBonus),
      Math.round(e.total),
      `"${(e.explanation || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const totalRow = [
    'ИТОГО',
    '', '', '', '', '', '', '', '',
    '',
    Math.round(employees.reduce((s, e) => s + e.kpiBonus, 0)),
    Math.round(employees.reduce((s, e) => s + e.total, 0)),
    '',
  ].join(';');

  const info = `Филиал: ${branchName};Период: ${period}`;

  return BOM + [info, '', header, ...rows, '', totalRow].join('\r\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
