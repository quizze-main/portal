import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getManagerAvatar } from '@/lib/utils';

export interface ManagerShiftData {
  id: string;
  name: string;
  avatar?: string;
  planPercent: number;
  createdOrders: number;
  createdOrdersPlan: number;
}

interface ManagersOnShiftAccordionProps {
  managers: ManagerShiftData[];
  onManagerClick: (id: string) => void;
  className?: string;
}

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
  if (status === 'good') return 'text-success';
  if (status === 'warning') return 'text-warning';
  return 'text-destructive';
};

const getStatusBg = (status: 'good' | 'warning' | 'critical'): string => {
  if (status === 'good') return 'bg-success';
  if (status === 'warning') return 'bg-warning';
  return 'bg-destructive';
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toString();
};

export function ManagersOnShiftAccordion({ 
  managers, 
  onManagerClick, 
  className 
}: ManagersOnShiftAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">
            Менеджеры на смене
          </span>
          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
            {managers.length}
          </span>
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-border divide-y divide-border/50">
          {managers.map((manager) => {
            const status = getStatus(manager.planPercent);
            const initials = manager.name.split(' ').map(n => n[0]).join('').slice(0, 2);
            
            return (
              <button
                key={manager.id}
                onClick={() => onManagerClick(manager.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Name and Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {manager.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-sm font-bold", getStatusColor(status))}>
                        {manager.planPercent}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(manager.createdOrders)} ₽
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", getStatusBg(status))}
                      style={{ width: `${Math.min(manager.planPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}