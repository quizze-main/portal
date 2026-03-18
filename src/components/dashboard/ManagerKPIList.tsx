import { ChevronRight } from 'lucide-react';
import { KPISlider } from './KPISlider';
import { KPIMetric } from './KPICard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ManagerData {
  id: string;
  name: string;
  avatar?: string;
  metrics: KPIMetric[];
}

interface ManagerKPIListProps {
  managers: { id: string; name: string; avatar?: string; metric: KPIMetric }[];
  onManagerClick?: (managerId: string) => void;
}

export function ManagerKPIList({ managers, onManagerClick }: ManagerKPIListProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  return (
    <div className="space-y-2">
      {managers.map((manager) => (
        <div
          key={manager.id}
          onClick={() => onManagerClick?.(manager.id)}
          className="bg-card rounded-xl p-3 shadow-card cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={manager.avatar} alt={manager.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {getInitials(manager.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm text-card-foreground">
                {manager.name}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <KPISlider
            current={manager.metric.current}
            plan={manager.metric.plan}
            reserve={manager.metric.reserve}
            forecast={manager.metric.forecast}
            status={manager.metric.status}
            unit={manager.metric.unit}
            compact
          />
        </div>
      ))}
    </div>
  );
}
