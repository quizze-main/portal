import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Upload } from 'lucide-react';
import { getBranchName } from '@/data/branchData';

interface SessionSummary {
  id: string;
  branchId: string;
  period: string;
  createdAt: string;
  createdBy: string;
  employeeCount: number;
  totalSalary: number;
}

interface SessionHistoryProps {
  sessions: SessionSummary[];
  isLoading: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ru-RU');
}

export const SessionHistory = memo(function SessionHistory({
  sessions,
  isLoading,
  onLoad,
  onDelete,
}: SessionHistoryProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-2">Загрузка истории...</div>;
  }

  if (sessions.length === 0) {
    return <div className="text-sm text-muted-foreground py-2">Нет сохранённых расчётов</div>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
        >
          <div className="flex gap-4 items-center">
            <span className="font-medium">{getBranchName(s.branchId) || s.branchId}</span>
            <span className="text-muted-foreground">{s.period}</span>
            <span className="text-muted-foreground">{s.employeeCount} чел.</span>
            <span className="font-medium">{fmt(s.totalSalary)} ₽</span>
            <span className="text-xs text-muted-foreground">
              {new Date(s.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onLoad(s.id)} title="Загрузить">
              <Upload className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)} title="Удалить">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
});
