import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getManagerAvatar } from '@/lib/utils';

// Shared types for Clients ranking
export type ClientsSortField = 'planPercent' | 'name' | 'total' | 'newClients' | 'repeatClients' | 'oldCheck' | 'lcaInstallations' | 'lostRevenue';

export interface MetricValue {
  value: number;
  forecast: number;
}

export interface ClientsRankingRow {
  id: string;
  rank: number;
  name: string;
  role?: string;
  avatar?: string;
  planPercent: number;
  total: MetricValue;
  newClients: MetricValue;
  repeatClients: MetricValue;
  oldCheck: MetricValue;
  lcaInstallations: MetricValue;
  lostRevenue: number;
}

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
};

const getPercentColor = (percent: number): string => {
  if (percent >= 100) return 'text-emerald-600';
  if (percent >= 80) return 'text-amber-500';
  return 'text-red-500';
};

const getProgressColor = (percent: number): string => {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

interface CompactMetricProps {
  label: string;
  metric: MetricValue;
  showPercentFirst: boolean;
  highlighted?: boolean;
}

const CompactMetric: React.FC<CompactMetricProps> = ({ label, metric, showPercentFirst, highlighted }) => {
  const percentColor = getPercentColor(metric.forecast);
  
  return (
    <div className={cn(
      "text-center p-1.5 rounded",
      highlighted && "bg-primary/5"
    )}>
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      {showPercentFirst ? (
        <>
          <div className={cn("text-xs font-bold tabular-nums", percentColor)}>{metric.forecast}%</div>
          <div className="text-[10px] text-muted-foreground tabular-nums">{metric.value}</div>
        </>
      ) : (
        <>
          <div className="text-xs font-bold tabular-nums">{metric.value}</div>
          <div className={cn("text-[10px] font-medium tabular-nums", percentColor)}>{metric.forecast}%</div>
        </>
      )}
    </div>
  );
};

interface ClientsRankingCardProps {
  manager: ClientsRankingRow;
  showPercentFirst: boolean;
  highlightedField?: ClientsSortField;
  onClick?: () => void;
}

export const ClientsRankingCard: React.FC<ClientsRankingCardProps> = ({
  manager,
  showPercentFirst,
  highlightedField,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border shadow-sm p-3 cursor-pointer transition-colors hover:bg-muted/20",
        manager.rank <= 3 && "border-l-2 border-l-primary"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
          manager.rank <= 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {manager.rank}
        </span>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
            {getInitials(manager.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{manager.name}</p>
          {manager.role && (
            <p className="text-xs text-muted-foreground truncate">{manager.role}</p>
          )}
        </div>
      </div>
      
      {/* Plan progress */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", getProgressColor(manager.planPercent))}
            style={{ width: `${Math.min(manager.planPercent, 100)}%` }}
          />
        </div>
        <span className={cn("text-sm font-bold tabular-nums min-w-[40px] text-right", getPercentColor(manager.planPercent))}>
          {manager.planPercent}%
        </span>
      </div>
      
      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-1">
        <CompactMetric 
          label="Всего" 
          metric={manager.total} 
          showPercentFirst={showPercentFirst}
          highlighted={highlightedField === 'total'}
        />
        <CompactMetric 
          label="Новые" 
          metric={manager.newClients} 
          showPercentFirst={showPercentFirst}
          highlighted={highlightedField === 'newClients'}
        />
        <CompactMetric 
          label="Повторные" 
          metric={manager.repeatClients} 
          showPercentFirst={showPercentFirst}
          highlighted={highlightedField === 'repeatClients'}
        />
        <CompactMetric 
          label=">6 мес." 
          metric={manager.oldCheck} 
          showPercentFirst={showPercentFirst}
          highlighted={highlightedField === 'oldCheck'}
        />
        <CompactMetric 
          label="LCA уст." 
          metric={manager.lcaInstallations} 
          showPercentFirst={showPercentFirst}
          highlighted={highlightedField === 'lcaInstallations'}
        />
        <div className={cn(
          "text-center p-1.5 rounded bg-amber-50 dark:bg-amber-900/20",
          highlightedField === 'lostRevenue' && "ring-1 ring-amber-400"
        )}>
          <div className="text-[10px] text-muted-foreground mb-0.5">Потери</div>
          <div className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
            −{formatNumber(manager.lostRevenue)}
          </div>
        </div>
      </div>
    </div>
  );
};
