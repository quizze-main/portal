import { cn } from '@/lib/utils';
import { TrendingUp, Users, Percent, Star, BarChart3 } from 'lucide-react';

interface RankingItem {
  id: string;
  label: string;
  rank: number;
  total: number;
  icon: React.ElementType;
}

interface ManagerRankingBadgeProps {
  rankings: {
    revenue?: number;
    conversion?: number;
    csi?: number;
    avgCheck?: number;
    clients?: number;
  };
  totalManagers: number;
  className?: string;
}

export function ManagerRankingBadge({ 
  rankings, 
  totalManagers,
  className 
}: ManagerRankingBadgeProps) {
  const items: RankingItem[] = [];
  
  if (rankings.revenue !== undefined) {
    items.push({ id: 'revenue', label: 'Выручка', rank: rankings.revenue, total: totalManagers, icon: TrendingUp });
  }
  if (rankings.conversion !== undefined) {
    items.push({ id: 'conversion', label: 'Конверсия', rank: rankings.conversion, total: totalManagers, icon: Percent });
  }
  if (rankings.csi !== undefined) {
    items.push({ id: 'csi', label: 'CSI', rank: rankings.csi, total: totalManagers, icon: Star });
  }
  if (rankings.avgCheck !== undefined) {
    items.push({ id: 'avgCheck', label: 'Ср. чек', rank: rankings.avgCheck, total: totalManagers, icon: BarChart3 });
  }
  if (rankings.clients !== undefined) {
    items.push({ id: 'clients', label: 'Клиенты', rank: rankings.clients, total: totalManagers, icon: Users });
  }

  if (items.length === 0) return null;

  const getRankColor = (rank: number, total: number) => {
    const percent = (rank / total) * 100;
    if (percent <= 33) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    if (percent <= 66) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium",
              getRankColor(item.rank, item.total)
            )}
          >
            <Icon className="h-3 w-3" />
            <span>#{item.rank}</span>
            <span className="text-muted-foreground/70">из {item.total}</span>
          </div>
        );
      })}
    </div>
  );
}
