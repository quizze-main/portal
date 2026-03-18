import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Users, CreditCard, Eye, ChevronDown, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManagerBreakdown {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  plan: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  plan: number;
  color: string;
}

export interface ExpandableOrderStat {
  id: string;
  name: string;
  value: number;
  plan: number;
  unit: string;
  managers?: ManagerBreakdown[];
  breakdown?: CategoryBreakdown[];
}

interface ExpandableStatsRowProps {
  stats: ExpandableOrderStat[];
  className?: string;
}

const formatValue = (value: number, unit: string): string => {
  if (unit === '₽') {
    return value.toLocaleString('ru-RU') + ' ₽';
  }
  return value.toLocaleString('ru-RU');
};

const getIcon = (id: string) => {
  switch (id) {
    case 'orders_count': return ShoppingCart;
    case 'avg_price': return CreditCard;
    case 'checks_count': return Users;
    case 'checks_vision': return Eye;
    default: return ShoppingCart;
  }
};

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 90) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'good': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'critical': return 'bg-destructive';
  }
};

const getStatusTextColor = (status: 'good' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'good': return 'text-success';
    case 'warning': return 'text-warning';
    case 'critical': return 'text-destructive';
  }
};

export function ExpandableStatsRow({ stats, className }: ExpandableStatsRowProps) {
  const navigate = useNavigate();
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);

  const hasDetails = (stat: ExpandableOrderStat) => 
    (stat.managers && stat.managers.length > 0) || (stat.breakdown && stat.breakdown.length > 0);

  const selectedStat = stats.find(s => s.id === selectedStatId);

  const handleCardClick = (stat: ExpandableOrderStat) => {
    if (!hasDetails(stat)) return;
    setSelectedStatId(prev => prev === stat.id ? null : stat.id);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Stable grid of cards */}
      <div className={cn(
        "grid gap-3",
        stats.length === 2 ? "grid-cols-2" : 
        stats.length === 3 ? "grid-cols-3" : 
        "grid-cols-2 lg:grid-cols-4"
      )}>
        {stats.map((stat) => {
          const Icon = getIcon(stat.id);
          const percent = Math.round((stat.value / stat.plan) * 100);
          const status = getStatus(percent);
          const isSelected = selectedStatId === stat.id;
          const canExpand = hasDetails(stat);

          return (
            <div 
              key={stat.id}
              onClick={() => handleCardClick(stat)}
              className={cn(
                "rounded-xl border bg-card p-3 lg:p-4 transition-all duration-200",
                canExpand && "cursor-pointer hover:bg-accent/5",
                isSelected && "ring-2 ring-primary/30 bg-accent/5"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                {canExpand && (
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    isSelected && "rotate-180"
                  )} />
                )}
              </div>
              
              <div className="space-y-1">
                <div className="text-lg lg:text-xl font-bold text-foreground">
                  {formatValue(stat.value, stat.unit)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {stat.name}
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-3 space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all", getStatusColor(status))}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  {percent}% от плана
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded details below the grid */}
      {selectedStat && (
        <div className="rounded-xl border bg-card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-foreground">
              {selectedStat.name}
            </div>
            <button 
              onClick={() => setSelectedStatId(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Закрыть
            </button>
          </div>

          {/* Manager breakdown */}
          {selectedStat.managers && selectedStat.managers.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                По менеджерам
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {selectedStat.managers.map((manager) => {
                  const mPercent = Math.round((manager.value / manager.plan) * 100);
                  const mStatus = getStatus(mPercent);
                  return (
                    <button
                      key={manager.id}
                      onClick={() => navigate(`/dashboard/manager/${manager.id}`)}
                      className="p-2 rounded-lg bg-muted/30 space-y-1.5 text-left hover:bg-muted/50 transition-colors group cursor-pointer w-full"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-foreground font-medium truncate max-w-[100px]">
                            {manager.name.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {formatValue(manager.value, selectedStat.unit)}
                          </span>
                          <span className={cn("text-xs font-medium", getStatusTextColor(mStatus))}>
                            {mPercent}%
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getStatusColor(mStatus))}
                          style={{ width: `${Math.min(mPercent, 100)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {selectedStat.breakdown && selectedStat.breakdown.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                По категориям
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {selectedStat.breakdown.map((item) => {
                  const bPercent = Math.round((item.value / item.plan) * 100);
                  return (
                    <div key={item.name} className="p-2 rounded-lg bg-muted/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {formatValue(item.value, selectedStat.unit)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {bPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${Math.min(bPercent, 100)}%`,
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
