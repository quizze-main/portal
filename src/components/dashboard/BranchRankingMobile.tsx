import { useMemo } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { BranchRankingCard, type BranchRankingRow, type DisplayMode } from "./BranchRankingCard";
import { RankingColumnsEditor } from "./RankingColumnsEditor";
import type { RankingColumnDef } from "@/hooks/useLeaderMetrics";

type SortDirection = "asc" | "desc";

interface SortConfig {
  field: string;
  direction: SortDirection;
}

interface BranchRankingMobileProps {
  rows: BranchRankingRow[];
  displayMode: DisplayMode;
  isInverted: boolean;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onInvertedChange: (value: boolean) => void;
  onBranchClick?: (branchId: string) => void;
  sortConfig: SortConfig;
  onSort: (field: string) => void;
  loadedMetrics?: Set<string>;
  columnDefs: RankingColumnDef[];
  visibleColumns?: string[];
  isEditMode?: boolean;
  onColumnsChange?: (codes: string[]) => void;
  availableMetrics?: Array<{ id: string; name: string; trackerCode?: string }>;
  title?: string;
}

export function BranchRankingMobile({
  rows,
  displayMode,
  isInverted,
  onDisplayModeChange,
  onInvertedChange,
  onBranchClick,
  sortConfig,
  onSort,
  loadedMetrics,
  columnDefs,
  visibleColumns,
  isEditMode,
  onColumnsChange,
  availableMetrics,
  title,
}: BranchRankingMobileProps) {
  // Build sort options from column defs
  const sortOptions = useMemo(() => {
    const opts: { field: string; label: string }[] = [
      { field: "planPercent", label: "% плана" },
      { field: "name", label: "Филиал" },
    ];
    columnDefs.forEach(col => {
      opts.push({ field: col.code, label: col.label });
    });
    if (columnDefs.some(c => c.code === "revenue_created")) {
      opts.push({ field: "lostRevenue", label: "Потери/запас" });
    }
    return opts;
  }, [columnDefs]);

  const currentSortLabel = sortOptions.find((o) => o.field === sortConfig.field)?.label || "Сортировка";

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-muted/60">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">{title || 'Рейтинг филиалов'}</h3>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px] sm:text-xs gap-1.5 flex-1 justify-between bg-background rounded-full border border-border/60"
              >
                <span className="truncate">{currentSortLabel}</span>
                <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 bg-popover z-50 text-[11px] sm:text-xs">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => onSort(option.field)}
                  className={`max-w-[11rem] truncate ${sortConfig.field === option.field ? "bg-muted" : ""}`}
                  title={option.label}
                >
                  {option.label}
                  {sortConfig.field === option.field && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {sortConfig.direction === "desc" ? "↓" : "↑"}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 rounded-full bg-muted p-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onDisplayModeChange("fact")}
              className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
                displayMode === "fact"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Прогноз
            </button>
            <button
              type="button"
              onClick={() => onInvertedChange(!isInverted)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Инверсия"
              title="Инверсия"
            >
              <ArrowUpDown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDisplayModeChange("plan")}
              className={`h-7 px-3 text-[11px] sm:text-xs rounded-full transition ${
                displayMode === "plan"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              План
            </button>
          </div>
        </div>
      </div>

      {isEditMode && onColumnsChange && visibleColumns && (
        <RankingColumnsEditor
          type="branch"
          visibleColumns={visibleColumns}
          onChange={onColumnsChange}
          availableMetrics={availableMetrics}
        />
      )}

      <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
        {rows.map((row) => (
          <BranchRankingCard
            key={row.id}
            branch={row}
            displayMode={displayMode}
            isInverted={isInverted}
            highlightedField={sortConfig.field}
            onClick={onBranchClick ? () => onBranchClick(row.id) : undefined}
            loadedMetrics={loadedMetrics}
            columnDefs={columnDefs}
          />
        ))}
      </div>
    </div>
  );
}
