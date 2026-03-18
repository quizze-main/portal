import { useEffect, useMemo } from "react";
import { ChevronDown, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BranchOption = {
  id: string;
  name: string;
};

type BranchSelectorProps = {
  branches: BranchOption[];
  selectedBranchIds: string[];
  onSelectionChange: (ids: string[]) => void;
  storageKey?: string;
  disabled?: boolean;
};

export function BranchSelector({
  branches,
  selectedBranchIds,
  onSelectionChange,
  storageKey,
  disabled = false,
}: BranchSelectorProps) {
  const normalizedBranches = useMemo(
    () => branches.filter((b) => Boolean(b?.id)).map((b) => ({ id: String(b.id), name: String(b.name) })),
    [branches]
  );

  const normalizedSelected = useMemo(() => {
    const allowed = new Set(normalizedBranches.map((b) => b.id));
    const unique = Array.from(new Set(selectedBranchIds.map(String))).filter((id) => allowed.has(id));
    return unique.length > 0 ? unique : normalizedBranches.map((b) => b.id);
  }, [selectedBranchIds, normalizedBranches]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(normalizedSelected));
    } catch {
      // ignore
    }
  }, [storageKey, normalizedSelected]);

  const selectedCount = normalizedSelected.length;
  const label =
    selectedCount === normalizedBranches.length
      ? `Все филиалы (${normalizedBranches.length})`
      : selectedCount === 1
        ? normalizedBranches.find((b) => b.id === normalizedSelected[0])?.name ?? "1 филиал"
        : `${selectedCount} филиала`;

  const toggleBranch = (branchId: string) => {
    if (disabled) return;
    const id = String(branchId);
    const isSelected = normalizedSelected.includes(id);
    if (isSelected) {
      if (normalizedSelected.length <= 1) return; // keep at least one
      onSelectionChange(normalizedSelected.filter((x) => x !== id));
      return;
    }
    onSelectionChange([...normalizedSelected, id]);
  };

  const setAll = () => {
    if (disabled) return;
    onSelectionChange(normalizedBranches.map((b) => b.id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || normalizedBranches.length <= 1}
          className="h-8 px-3 text-xs gap-2 rounded-full bg-background border border-border/60 justify-between min-w-[190px]"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="text-xs font-medium text-foreground">Филиалы</div>
          <button
            type="button"
            onClick={setAll}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Выбрать все
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {normalizedBranches.map((b) => {
            const checked = normalizedSelected.includes(b.id);
            const isLastChecked = checked && normalizedSelected.length <= 1;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBranch(b.id)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 text-left"
                title={b.name}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled || isLastChecked}
                  // We toggle on the row click; otherwise checkbox click bubbles
                  // and triggers toggle twice (select -> immediately unselect).
                  className="pointer-events-none"
                />
                <span className="text-xs text-foreground truncate">{b.name}</span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

