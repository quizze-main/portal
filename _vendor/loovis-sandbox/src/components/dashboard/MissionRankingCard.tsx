import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, Stethoscope, Smartphone, Baby, ArrowRight } from 'lucide-react';
import { getManagerAvatar } from '@/lib/utils';

export interface MissionManagerRow {
  id: string;
  name: string;
  avatar?: string;
  rank: number;
  diagnostics: { current: number; plan: number };
  lca: { current: number; plan: number };
  children: { current: number; plan: number };
  conversion: { current: number; plan: number }; // percentage
  overallPercent: number;
}

interface MissionRankingCardProps {
  row: MissionManagerRow;
  onClick?: () => void;
}

const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const getProgressBg = (percent: number): string => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-destructive';
};

const getRankBorderColor = (rank: number): string => {
  if (rank === 1) return 'border-l-amber-400';
  if (rank === 2) return 'border-l-slate-400';
  if (rank === 3) return 'border-l-amber-600';
  return 'border-l-transparent';
};

interface MetricBadgeProps {
  icon: React.ReactNode;
  current: number;
  plan: number;
  isPercent?: boolean;
}

function MetricBadge({ icon, current, plan, isPercent = false }: MetricBadgeProps) {
  const percent = Math.round((current / plan) * 100);
  const displayValue = isPercent ? `${current}%` : current;
  
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/50">
      <span className="text-amber-600 dark:text-amber-400">{icon}</span>
      <div className="flex flex-col">
        <span className={`text-xs font-bold leading-none ${getPercentColor(percent)}`}>
          {displayValue}
        </span>
        <span className="text-[9px] text-muted-foreground">/ {isPercent ? `${plan}%` : plan}</span>
      </div>
    </div>
  );
}

export function MissionRankingCard({ row, onClick }: MissionRankingCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:bg-muted/30 transition-all text-left border-l-4 ${getRankBorderColor(row.rank)}`}
    >
      {/* Top row: Rank + Avatar + Name + Overall % */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground w-5">
            #{row.rank}
          </span>
          <Avatar className="h-9 w-9">
            <AvatarImage src={getManagerAvatar(row.id)} alt={row.name} />
            <AvatarFallback className="text-xs bg-amber-100 text-amber-800">
              {row.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{row.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getProgressBg(row.overallPercent)}`}
                style={{ width: `${Math.min(row.overallPercent, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${getPercentColor(row.overallPercent)}`}>
              {row.overallPercent}%
            </span>
          </div>
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
      
      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-1.5">
        <MetricBadge
          icon={<Stethoscope className="w-3 h-3" />}
          current={row.diagnostics.current}
          plan={row.diagnostics.plan}
        />
        <MetricBadge
          icon={<Smartphone className="w-3 h-3" />}
          current={row.lca.current}
          plan={row.lca.plan}
        />
        <MetricBadge
          icon={<Baby className="w-3 h-3" />}
          current={row.children.current}
          plan={row.children.plan}
        />
        <MetricBadge
          icon={<ArrowRight className="w-3 h-3" />}
          current={row.conversion.current}
          plan={row.conversion.plan}
          isPercent
        />
      </div>
    </button>
  );
}
