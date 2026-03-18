import { Progress } from '@/components/ui/progress';

interface EarningsCardProps {
  baseSalary: number;
  bonusPercent: number;
  bonusAmount: number;
  kpiBonus: number;
  total: number;
  personalPercent: number;
  personalFact: number;
  personalPlan: number;
  clubPercent: number;
  clubFact: number;
  clubPlan: number;
}

function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('ru-RU') + ' ₽';
}

function formatFull(value: number): string {
  return value.toLocaleString('ru-RU');
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-success';
  if (percent >= 95) return 'bg-warning';
  return 'bg-destructive';
}

function getTextColor(percent: number): string {
  if (percent >= 100) return 'text-success';
  if (percent >= 95) return 'text-warning';
  return 'text-destructive';
}

export function EarningsCard({
  baseSalary,
  bonusPercent,
  bonusAmount,
  kpiBonus,
  total,
  personalPercent,
  personalFact,
  personalPlan,
  clubPercent,
  clubFact,
  clubPlan,
}: EarningsCardProps) {
  return (
    <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-card border-0">
      {/* Заголовок с суммой в одну строку */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
        <span className="text-sm font-medium text-muted-foreground">
          Прогноз ЗП
        </span>
        <span className="text-xl font-bold text-primary">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Прогресс-бары в 2 колонки */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* План менеджера по СЗ */}
        <div className="bg-muted/30 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground font-medium">План менеджера по СЗ</span>
            <span className={`font-bold ${getTextColor(personalPercent)}`}>
              {personalPercent}%
            </span>
          </div>
          <Progress
            value={Math.min(personalPercent, 100)}
            className="h-1.5"
            indicatorClassName={getProgressColor(personalPercent)}
          />
          <div className="text-[10px] text-muted-foreground mt-1">
            {formatFull(personalFact)} / {formatFull(personalPlan)}
          </div>
        </div>

        {/* План филиала по СЗ */}
        <div className="bg-muted/30 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground font-medium">План филиала по СЗ</span>
            <span className={`font-bold ${getTextColor(clubPercent)}`}>
              {clubPercent}%
            </span>
          </div>
          <Progress
            value={Math.min(clubPercent, 100)}
            className="h-1.5"
            indicatorClassName={getProgressColor(clubPercent)}
          />
          <div className="text-[10px] text-muted-foreground mt-1">
            {formatFull(clubFact)} / {formatFull(clubPlan)}
          </div>
        </div>
      </div>

      {/* 3 колонки: Оклад, Премия, KPI */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="text-sm font-semibold text-foreground">
            {formatCurrency(baseSalary)}
          </div>
          <div className="text-[10px] text-muted-foreground">Оклад</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="text-sm font-semibold text-success">
            {formatCurrency(bonusAmount)}
          </div>
          <div className="text-[10px] text-muted-foreground">Премия {bonusPercent}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="text-sm font-semibold text-primary">
            {formatCurrency(kpiBonus)}
          </div>
          <div className="text-[10px] text-muted-foreground">KPI</div>
        </div>
      </div>
    </div>
  );
}