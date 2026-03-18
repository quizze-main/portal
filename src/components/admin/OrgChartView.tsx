import React, { useState, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent, useTransformContext } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, Expand, Shrink, Folder, FolderOpen, Star, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmployeeAvatar } from '@/components/ui/avatar';
import type { OrgDepartmentNode, OrgEmployeeNode } from '@/lib/orgTreeBuilder';

// ── CSS for connecting lines ──
const ORG_CHART_STYLE_ID = 'org-chart-lines';

function injectOrgChartStyles() {
  if (typeof window === 'undefined') return;
  if (document.head.querySelector(`style[data-id="${ORG_CHART_STYLE_ID}"]`)) return;

  const style = document.createElement('style');
  style.setAttribute('data-id', ORG_CHART_STYLE_ID);
  style.textContent = `
    .org-chart-tree ul {
      display: flex;
      justify-content: center;
      padding-top: 24px;
      position: relative;
      list-style: none;
      margin: 0;
      padding-left: 0;
      padding-right: 0;
      padding-top: 24px;
    }

    .org-chart-tree > ul {
      padding-top: 0;
    }

    .org-chart-tree li {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      padding: 24px 6px 0;
      list-style: none;
    }

    .org-chart-tree > ul > li {
      padding-top: 0;
    }

    /* Vertical line up to horizontal connector */
    .org-chart-tree li::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 2px;
      height: 24px;
      background: hsl(var(--border));
      transform: translateX(-50%);
    }

    .org-chart-tree > ul > li::before {
      display: none;
    }

    /* Horizontal line connecting siblings */
    .org-chart-tree li::after {
      content: '';
      position: absolute;
      top: 0;
      width: 100%;
      height: 2px;
      background: hsl(var(--border));
      left: 0;
    }

    .org-chart-tree > ul > li::after {
      display: none;
    }

    .org-chart-tree li:first-child::after {
      left: 50%;
      width: 50%;
    }

    .org-chart-tree li:last-child::after {
      width: 50%;
    }

    .org-chart-tree li:only-child::after {
      display: none;
    }

    /* Vertical line down from parent to children connector */
    .org-chart-tree ul ul::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      width: 2px;
      height: 24px;
      background: hsl(var(--border));
      transform: translateX(-50%);
    }

    /* Smooth expand animation */
    .org-chart-tree .org-children-enter {
      animation: orgChildrenExpand 0.3s cubic-bezier(.4,0,.2,1);
    }
    @keyframes orgChildrenExpand {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

const MAX_VISIBLE_EMPLOYEES = 8;

// ── Employee Node ──
const OrgChartEmpNode = React.memo(function OrgChartEmpNode({ emp }: { emp: OrgEmployeeNode }) {
  return (
    <div className="w-[140px] rounded-lg border bg-card p-2 shadow-sm flex flex-col items-center gap-1 text-center">
      <EmployeeAvatar
        name={emp.name}
        image={emp.image}
        size="xs"
        fallbackColor={emp.isManager ? 'amber' : 'blue'}
      />
      <div className="w-full min-w-0">
        <div className="flex items-center justify-center gap-0.5">
          {emp.isManager && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
          <span className="text-xs font-medium truncate">{emp.name}</span>
        </div>
        {emp.designation && (
          <p className="text-[10px] text-muted-foreground truncate">{emp.designation}</p>
        )}
      </div>
    </div>
  );
});

// ── Department Node ──
const OrgChartDeptNode = React.memo(function OrgChartDeptNode({
  node,
  expandedIds,
  onToggle,
}: {
  node: OrgDepartmentNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);

  // Skip empty departments (no employees anywhere in subtree)
  if (node.employeeCount === 0) return null;

  const nonEmptyChildren = node.children.filter(c => c.employeeCount > 0);
  const hasContent = nonEmptyChildren.length > 0 || node.employees.length > 0;
  const manager = node.employees.find(e => e.isManager);

  const visibleEmployees = isExpanded
    ? node.employees.slice(0, MAX_VISIBLE_EMPLOYEES)
    : [];
  const hiddenCount = node.employees.length - MAX_VISIBLE_EMPLOYEES;

  return (
    <li>
      {/* Department card */}
      <button
        data-dept-id={node.id}
        onClick={() => hasContent && onToggle(node.id)}
        className={`w-[180px] rounded-lg border bg-card p-3 shadow-sm transition-all text-left
          ${hasContent ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : 'cursor-default'}
          ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isExpanded
            ? <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
            : <Folder className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="text-sm font-medium truncate flex-1">{node.label}</span>
        </div>

        {manager && (
          <div className="flex items-center gap-1.5 mb-1.5 bg-muted/40 rounded-md px-1.5 py-1">
            <EmployeeAvatar name={manager.name} image={manager.image} size="sm" fallbackColor="amber" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-xs font-medium truncate">{manager.name}</span>
              </div>
              {manager.designation && (
                <p className="text-[10px] text-muted-foreground truncate">{manager.designation}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{node.employeeCount}</span>
          </div>
          {hasContent && (
            isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Children */}
      {isExpanded && hasContent && (
        <ul className="org-children-enter">
          {nonEmptyChildren.map(child => (
            <OrgChartDeptNode
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
          {visibleEmployees.map(emp => (
            <li key={emp.id}>
              <OrgChartEmpNode emp={emp} />
            </li>
          ))}
          {hiddenCount > 0 && (
            <li>
              <div className="w-[140px] rounded-lg border border-dashed bg-muted/30 p-2 text-center">
                <span className="text-xs text-muted-foreground">+{hiddenCount} ещё</span>
              </div>
            </li>
          )}
        </ul>
      )}
    </li>
  );
});

// ── Toolbar (inside TransformWrapper) ──
function OrgChartToolbar({
  onExpandAll,
  onCollapseAll,
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const { zoomIn, zoomOut, resetTransform } = useTransformContext();

  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-md">
      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => zoomIn()} title="Приблизить">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => zoomOut()} title="Отдалить">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => resetTransform()} title="Сбросить масштаб">
        <Maximize2 className="w-4 h-4" />
      </Button>
      <div className="border-t my-0.5" />
      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onExpandAll} title="Развернуть всё">
        <Expand className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onCollapseAll} title="Свернуть всё">
        <Shrink className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Auto-focus logic (inside TransformWrapper) ──
function AutoFocusHandler({
  lastToggledId,
}: {
  lastToggledId: string | null;
}) {
  const { setTransform, instance } = useTransformContext();

  useEffect(() => {
    if (!lastToggledId) return;

    const deptId = lastToggledId.split(':')[0];

    // Wait for DOM to render expanded children (double-rAF ensures paint)
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;

        const deptButton = document.querySelector(
          `[data-dept-id="${CSS.escape(deptId)}"]`,
        ) as HTMLElement | null;
        if (!deptButton) return;

        // Find the <li> that wraps this dept + its expanded children subtree
        const li = deptButton.closest('li');
        if (!li) return;

        const { wrapperComponent, contentComponent, transformState } = instance;
        if (!wrapperComponent || !contentComponent) return;

        const currentScale = transformState.scale;
        const wrapperWidth = wrapperComponent.offsetWidth;
        const wrapperHeight = wrapperComponent.offsetHeight;

        // Get node bounding rect and convert to unscaled coordinates
        const nodeRect = li.getBoundingClientRect();
        const contentRect = contentComponent.getBoundingClientRect();

        const nodeWidth = nodeRect.width / currentScale;
        const nodeHeight = nodeRect.height / currentScale;

        // Scale needed to fit the subtree with 10% padding
        const fitScale = Math.min(wrapperWidth / nodeWidth, wrapperHeight / nodeHeight) * 0.9;

        // Only zoom out if needed to fit; never zoom in beyond current
        const newScale = Math.max(0.2, Math.min(currentScale, fitScale));

        // Node position relative to content origin (unscaled)
        const nodeLeft = (nodeRect.left - contentRect.left) / currentScale;
        const nodeTop = (nodeRect.top - contentRect.top) / currentScale;

        // Center the node in the wrapper (limitToBounds is false, unclamped X/Y is intentional)
        const newX = wrapperWidth / 2 - (nodeLeft + nodeWidth / 2) * newScale;
        const newY = wrapperHeight / 2 - (nodeTop + nodeHeight / 2) * newScale;

        setTransform(newX, newY, newScale, 300, 'easeOut');
      });
    });

    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [lastToggledId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Main Component ──
interface OrgChartViewProps {
  tree: OrgDepartmentNode[];
}

export function OrgChartView({ tree }: OrgChartViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lastToggledId, setLastToggledId] = useState<string | null>(null);

  useEffect(() => {
    injectOrgChartStyles();
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Trigger auto-focus — use a unique key so useEffect fires even on same id
    setLastToggledId(id + ':' + Date.now());
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    function collect(nodes: OrgDepartmentNode[]) {
      for (const n of nodes) { allIds.add(n.id); collect(n.children); }
    }
    collect(tree);
    setExpandedIds(allIds);
  }, [tree]);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-8 text-muted-foreground">
        <Folder className="w-8 h-8 opacity-40" />
        <p className="text-sm">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <TransformWrapper
        initialScale={0.85}
        minScale={0.2}
        maxScale={2.5}
        centerOnInit={true}
        limitToBounds={false}
        doubleClick={{ mode: 'zoomIn' }}
        pinch={{ disabled: false }}
        panning={{ disabled: false }}
        wheel={{ disabled: false, step: 0.08 }}
      >
        <OrgChartToolbar onExpandAll={expandAll} onCollapseAll={collapseAll} />
        <AutoFocusHandler lastToggledId={lastToggledId} />
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%', touchAction: 'none' }}
          contentStyle={{ display: 'flex', justifyContent: 'center', padding: '40px 20px', minWidth: 'max-content' }}
        >
          <div className="org-chart-tree">
            <ul>
              {tree.filter(n => n.employeeCount > 0).map(node => (
                <OrgChartDeptNode
                  key={node.id}
                  node={node}
                  expandedIds={expandedIds}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
