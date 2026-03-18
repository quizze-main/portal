import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, MapPin, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { BRANCHES } from '@/data/branchData';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'dashboard_selected_branches';

interface BranchSelectorProps {
  selectedBranches: string[];
  onSelectionChange: (branches: string[]) => void;
}

export function BranchSelector({ selectedBranches, onSelectionChange }: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const allBranchIds = useMemo(() => BRANCHES.map(b => b.id), []);
  const allSelected = selectedBranches.length === allBranchIds.length;
  
  const handleToggleBranch = (branchId: string) => {
    if (selectedBranches.includes(branchId)) {
      // Don't allow deselecting the last branch
      if (selectedBranches.length > 1) {
        onSelectionChange(selectedBranches.filter(id => id !== branchId));
      }
    } else {
      onSelectionChange([...selectedBranches, branchId]);
    }
  };
  
  const handleSelectAll = () => {
    onSelectionChange([...allBranchIds]);
  };
  
  const handleClearAll = () => {
    // Keep at least one branch selected
    onSelectionChange([allBranchIds[0]]);
  };
  
  // Display text for the button
  const displayText = useMemo(() => {
    if (allSelected) {
      return `Все филиалы (${allBranchIds.length})`;
    }
    if (selectedBranches.length === 1) {
      return BRANCHES.find(b => b.id === selectedBranches[0])?.name || 'Филиал';
    }
    if (selectedBranches.length === 2) {
      return selectedBranches
        .map(id => BRANCHES.find(b => b.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    }
    return `${selectedBranches.length} филиала`;
  }, [selectedBranches, allSelected, allBranchIds.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <MapPin className="w-3.5 h-3.5" />
          <span className="max-w-[200px] truncate">{displayText}</span>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="start" 
        className="w-64 p-0 bg-popover border shadow-lg z-50"
        sideOffset={8}
      >
        {/* Select All / Clear All */}
        <div className="px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={allSelected ? handleClearAll : handleSelectAll}
              className="h-7 px-2 text-xs"
            >
              {allSelected ? 'Снять все' : 'Выбрать все'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedBranches.length} из {allBranchIds.length}
            </span>
          </div>
        </div>
        
        {/* Branch list */}
        <div className="py-1 max-h-[300px] overflow-y-auto">
          {BRANCHES.map(branch => {
            const isSelected = selectedBranches.includes(branch.id);
            
            return (
              <div
                key={branch.id}
                onClick={() => handleToggleBranch(branch.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                  "hover:bg-muted/80",
                  isSelected && "bg-primary/5"
                )}
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => handleToggleBranch(branch.id)}
                  className="pointer-events-none"
                />
                <p className="flex-1 text-sm font-medium text-foreground truncate">
                  {branch.name}
                </p>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing branch selection with localStorage persistence
export function useBranchSelection() {
  const allBranchIds = useMemo(() => BRANCHES.map(b => b.id), []);
  
  const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored branches
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((id: string) => allBranchIds.includes(id as any));
        }
      }
    } catch {
      // Ignore errors
    }
    // Default: all branches selected
    return allBranchIds;
  });
  
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedBranches));
    } catch {
      // Ignore errors
    }
  }, [selectedBranches]);
  
  return {
    selectedBranches,
    setSelectedBranches,
    allBranchIds,
  };
}
