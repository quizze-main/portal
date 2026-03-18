import { Settings2, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditModeControlsProps {
  isEditMode: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export function EditModeControls({
  isEditMode,
  onToggleEdit,
  onSave,
  onCancel,
  onReset,
}: EditModeControlsProps) {
  if (!isEditMode) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleEdit}
        className="h-8 w-8"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onReset}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCancel}
        className="h-8 w-8 text-destructive hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        variant="default"
        size="icon"
        onClick={onSave}
        className="h-8 w-8"
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}
