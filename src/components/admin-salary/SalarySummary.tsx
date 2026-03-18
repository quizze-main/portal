import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Save } from 'lucide-react';

interface SalarySummaryProps {
  totals: {
    totalBase: number;
    totalBonus: number;
    totalKPI: number;
    totalSalary: number;
  } | null;
  employeeCount: number;
  onExportCsv: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ru-RU');
}

export const SalarySummary = memo(function SalarySummary({
  totals,
  employeeCount,
  onExportCsv,
  onSave,
  isSaving,
}: SalarySummaryProps) {
  if (!totals) return null;

  return (
    <div className="rounded-lg border bg-card p-4 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Сотрудников: </span>
            <span className="font-medium">{employeeCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Оклады: </span>
            <span className="font-medium">{fmt(totals.totalBase)} ₽</span>
          </div>
          <div>
            <span className="text-muted-foreground">Бонусы: </span>
            <span className="font-medium">{fmt(totals.totalBonus)} ₽</span>
          </div>
          <div>
            <span className="text-muted-foreground">KPI: </span>
            <span className="font-medium">{fmt(totals.totalKPI)} ₽</span>
          </div>
          <div>
            <span className="text-muted-foreground">Итого: </span>
            <span className="font-bold text-base">{fmt(totals.totalSalary)} ₽</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
});
