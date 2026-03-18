import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ManagerSwitcherItem {
  id: string;
  name: string;
  avatar?: string;
}

interface ManagerSwitcherProps {
  managers: ManagerSwitcherItem[];
  currentManagerId: string;
  onSelect: (managerId: string) => void;
}

function getShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  // Return last name (first word in Russian naming: Фамилия Имя Отчество)
  return parts[0] || fullName;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function ManagerSwitcher({ managers, currentManagerId, onSelect }: ManagerSwitcherProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [currentManagerId]);

  if (managers.length <= 1) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-3 py-2">
        {managers.map(manager => {
          const isActive = manager.id === currentManagerId;
          return (
            <button
              key={manager.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(manager.id)}
              className={cn(
                'flex flex-col items-center gap-1 flex-shrink-0 min-w-[56px] max-w-[64px] p-1 rounded-lg transition-colors',
                isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
              )}
            >
              <Avatar className={cn(
                'w-9 h-9 transition-all',
                isActive && 'ring-2 ring-primary ring-offset-1'
              )}>
                <AvatarImage src={manager.avatar} alt={manager.name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {getInitials(manager.name)}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                'text-[10px] leading-tight text-center truncate w-full',
                isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}>
                {getShortName(manager.name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
