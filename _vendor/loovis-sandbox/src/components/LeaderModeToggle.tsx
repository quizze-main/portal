import { Switch } from '@/components/ui/switch';
import { Crown } from 'lucide-react';

interface LeaderModeToggleProps {
  isLeaderMode: boolean;
  onToggle: (isLeaderMode: boolean) => void;
}

export function LeaderModeToggle({ isLeaderMode, onToggle }: LeaderModeToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-card rounded-lg p-2 border">
      <Crown className={`w-4 h-4 ${isLeaderMode ? 'text-warning' : 'text-muted-foreground'}`} />
      <span className="text-sm font-medium text-foreground">Режим лидера</span>
      <Switch
        checked={isLeaderMode}
        onCheckedChange={onToggle}
      />
    </div>
  );
}