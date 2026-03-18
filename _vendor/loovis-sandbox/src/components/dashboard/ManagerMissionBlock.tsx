import { Card, CardContent } from '@/components/ui/card';
import { Target, Stethoscope, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';

interface MissionMetric {
  current: number;
  plan: number;
}

interface ManagerMissionBlockProps {
  diagnostics: MissionMetric;
  lcaInstallations: MissionMetric;
  className?: string;
}

export function ManagerMissionBlock({ 
  diagnostics, 
  lcaInstallations,
  className 
}: ManagerMissionBlockProps) {
  const diagnosticsPercent = Math.round((diagnostics.current / diagnostics.plan) * 100);
  const lcaPercent = Math.round((lcaInstallations.current / lcaInstallations.plan) * 100);
  const avgPercent = Math.round((diagnosticsPercent + lcaPercent) / 2);

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-100 text-emerald-700';
    if (percent >= 80) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-amber-100">
              <Target className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">Миссия</h3>
          </div>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            getStatusBadge(avgPercent)
          )}>
            {avgPercent}%
          </span>
        </div>

        {/* Two inline metrics */}
        <div className="flex gap-2">
          {/* Диагностики */}
          <div className="flex-1 flex items-center gap-2 p-2 bg-amber-50/50 rounded-lg">
            <KPIDonutChart 
              value={diagnostics.current}
              maxValue={diagnostics.plan}
              forecast={diagnosticsPercent}
              displayValue={`${diagnosticsPercent}%`}
              color="#F59E0B"
              size={40}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-[10px] font-medium text-muted-foreground truncate">Диагностики</span>
              </div>
              <div className="text-xs font-bold text-foreground">
                {diagnostics.current}<span className="text-muted-foreground font-normal">/{diagnostics.plan}</span>
              </div>
            </div>
          </div>

          {/* Установки ЛКА */}
          <div className="flex-1 flex items-center gap-2 p-2 bg-amber-50/50 rounded-lg">
            <KPIDonutChart 
              value={lcaInstallations.current}
              maxValue={lcaInstallations.plan}
              forecast={lcaPercent}
              displayValue={`${lcaPercent}%`}
              color="#F59E0B"
              size={40}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-[10px] font-medium text-muted-foreground truncate">ЛКА</span>
              </div>
              <div className="text-xs font-bold text-foreground">
                {lcaInstallations.current}<span className="text-muted-foreground font-normal">/{lcaInstallations.plan}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
