import { Card } from '@/components/ui/card';
import { Target, Stethoscope, Smartphone, Baby, ArrowRight } from 'lucide-react';
import { KPIDonutChart } from './KPIDonutChart';

export interface MissionKPIs {
  diagnostics: { current: number; plan: number };
  lca: { current: number; plan: number };
  children: { current: number; plan: number };
  conversion: { current: number; plan: number }; // percentage
}

interface MissionKPIGridProps {
  kpis: MissionKPIs;
  className?: string;
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

const getStatusColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const getDonutColor = (percent: number): string => {
  if (percent >= 100) return '#10b981';
  if (percent >= 80) return '#f59e0b';
  return 'hsl(var(--destructive))';
};

interface KPIItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  plan: number;
  unit?: string;
  isPercent?: boolean;
}

function KPIItem({ icon, label, current, plan, unit = 'шт', isPercent = false }: KPIItemProps) {
  const percent = Math.round((current / plan) * 100);
  const displayValue = isPercent ? `${current}%` : formatNumber(current);
  const displayPlan = isPercent ? `${plan}%` : formatNumber(plan);
  
  // Для центра круга — всегда показывать процент выполнения
  const donutDisplayValue = `${percent}%`;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
      <KPIDonutChart
        value={current}
        maxValue={plan}
        displayValue={donutDisplayValue}
        color={getDonutColor(percent)}
        size={48}
        isCompact
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-amber-600 dark:text-amber-400">{icon}</span>
          <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-bold ${getStatusColor(percent)}`}>
            {displayValue}
          </span>
          <span className="text-xs text-muted-foreground">/ {displayPlan}</span>
        </div>
        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: getDonutColor(percent)
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function MissionKPIGrid({ kpis, className = '' }: MissionKPIGridProps) {
  const diagnosticsPercent = Math.round((kpis.diagnostics.current / kpis.diagnostics.plan) * 100);
  const lcaPercent = Math.round((kpis.lca.current / kpis.lca.plan) * 100);
  const childrenPercent = Math.round((kpis.children.current / kpis.children.plan) * 100);
  const conversionPercent = Math.round((kpis.conversion.current / kpis.conversion.plan) * 100);
  
  const avgPercent = Math.round((diagnosticsPercent + lcaPercent + childrenPercent + conversionPercent) / 4);
  
  return (
    <Card className={`p-4 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10 border-amber-200/50 dark:border-amber-800/30 ${className}`}>
      {/* Mission Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Миссия</h3>
            <p className="text-[10px] text-muted-foreground italic leading-tight max-w-[320px]">
              "Каждое последующее поколение должно видеть лучше благодаря заботе о зрении с детства"
            </p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          avgPercent >= 100 
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : avgPercent >= 80 
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-destructive/20 text-destructive'
        }`}>
          {avgPercent}%
        </div>
      </div>
      
      {/* 2x2 Grid of KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <KPIItem
          icon={<Stethoscope className="w-3.5 h-3.5" />}
          label="Диагностики"
          current={kpis.diagnostics.current}
          plan={kpis.diagnostics.plan}
        />
        <KPIItem
          icon={<Smartphone className="w-3.5 h-3.5" />}
          label="Установки ЛКА"
          current={kpis.lca.current}
          plan={kpis.lca.plan}
        />
        <KPIItem
          icon={<Baby className="w-3.5 h-3.5" />}
          label="Детские проверки"
          current={kpis.children.current}
          plan={kpis.children.plan}
        />
        <KPIItem
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          label="Конверсия диагн."
          current={kpis.conversion.current}
          plan={kpis.conversion.plan}
          isPercent
        />
      </div>
    </Card>
  );
}
