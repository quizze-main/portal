import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ApiExplorerPanel from './ApiExplorerPanel';

interface ApiExplorerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceLabel?: string;
  initialPath?: string;
  onSelectFactPath?: (path: string) => void;
  onSelectPlanPath?: (path: string) => void;
  currentFactPath?: string;
  currentPlanPath?: string;
}

const ApiExplorerDialog: React.FC<ApiExplorerDialogProps> = ({
  open,
  onOpenChange,
  sourceId,
  sourceLabel,
  initialPath,
  onSelectFactPath,
  onSelectPlanPath,
  currentFactPath,
  currentPlanPath,
}) => {
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);

  const handlePathSelect = (path: string) => {
    setLastSelectedPath(path);
  };

  const selectedPaths: string[] = [];
  if (currentFactPath) selectedPaths.push(currentFactPath);
  if (currentPlanPath) selectedPaths.push(currentPlanPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">
            API Explorer{sourceLabel ? ` — ${sourceLabel}` : ''}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Click on any value in the tree to select its JSONPath
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ApiExplorerPanel
            sourceId={sourceId}
            initialPath={initialPath}
            onPathSelect={handlePathSelect}
            selectedPaths={selectedPaths}
          />
        </div>

        {/* Path selection actions */}
        {lastSelectedPath && (onSelectFactPath || onSelectPlanPath) && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              Selected: <span className="font-mono text-foreground">{lastSelectedPath}</span>
            </div>
            <div className="flex gap-2">
              {onSelectFactPath && (
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs h-7"
                  onClick={() => {
                    onSelectFactPath(lastSelectedPath);
                    onOpenChange(false);
                  }}
                >
                  Use as Fact path
                </Button>
              )}
              {onSelectPlanPath && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    onSelectPlanPath(lastSelectedPath);
                    onOpenChange(false);
                  }}
                >
                  Use as Plan path
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApiExplorerDialog;
