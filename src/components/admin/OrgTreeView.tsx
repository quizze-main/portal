import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, Star, Plus, MoreHorizontal, Pencil, Trash2, UserPlus, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { internalApiClient } from '@/lib/internalApiClient';
import type { OrgDepartmentNode, OrgEmployeeNode } from '@/lib/orgTreeBuilder';
import { filterOrgTree } from '@/lib/orgTreeBuilder';

interface OrgTreeViewProps {
  tree: OrgDepartmentNode[];
  searchQuery?: string;
  onEditDepartment: (dept: OrgDepartmentNode) => void;
  onDeleteDepartment: (dept: OrgDepartmentNode) => void;
  onAddChildDepartment: (parentDept: OrgDepartmentNode) => void;
  onAddEmployee: (dept: OrgDepartmentNode) => void;
  onEditEmployee: (emp: OrgEmployeeNode) => void;
  onDeleteEmployee: (emp: OrgEmployeeNode) => void;
}

// ── Employee Row ──
const EmployeeRow = React.memo(function EmployeeRow({
  emp, onEdit, onDelete,
}: {
  emp: OrgEmployeeNode;
  onEdit: (emp: OrgEmployeeNode) => void;
  onDelete: (emp: OrgEmployeeNode) => void;
}) {
  const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {emp.image ? (
          <img src={internalApiClient.getEmployeeImageUrl(emp.id)} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">{initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {emp.isManager && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
          <span className={`text-sm truncate ${emp.isManager ? 'font-medium' : ''}`}>{emp.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {emp.designation && <span className="truncate">{emp.designation}</span>}
          {emp.reportsToName && (
            <span className="truncate">→ {emp.reportsToName}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(emp)}>
            <Pencil className="w-4 h-4 mr-2" /> Редактировать
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(emp)} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-2" /> Деактивировать
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// ── Department Row ──
const DepartmentRow = React.memo(function DepartmentRow({
  node, level, isOpen, openIds, onToggle, onEditDept, onDeleteDept, onAddChildDept, onAddEmp, onEditEmp, onDeleteEmp,
}: {
  node: OrgDepartmentNode;
  level: number;
  isOpen: boolean;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onEditDept: (dept: OrgDepartmentNode) => void;
  onDeleteDept: (dept: OrgDepartmentNode) => void;
  onAddChildDept: (dept: OrgDepartmentNode) => void;
  onAddEmp: (dept: OrgDepartmentNode) => void;
  onEditEmp: (emp: OrgEmployeeNode) => void;
  onDeleteEmp: (emp: OrgEmployeeNode) => void;
}) {
  const hasContent = node.children.length > 0 || node.employees.length > 0;
  const isVirtual = node.id === '__unassigned__';

  return (
    <div style={{ paddingLeft: level * 16 }}>
      {/* Department header */}
      <div className="flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 group">
        <button onClick={() => hasContent && onToggle(node.id)} className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasContent ? (
            isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : <span className="w-4" />}
        </button>

        {isOpen ? <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" /> : <Folder className="w-4 h-4 text-muted-foreground shrink-0" />}

        <span className="text-sm font-medium truncate flex-1">{node.label}</span>

        {node.employeeCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
            {node.employeeCount}
          </span>
        )}

        {!isVirtual && (
          <>
            {/* Add dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddChildDept(node)}>
                  <FolderPlus className="w-4 h-4 mr-2" /> Подразделение
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddEmp(node)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Сотрудник
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditDept(node)}>
                  <Pencil className="w-4 h-4 mr-2" /> Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteDept(node)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Children */}
      {isOpen && (
        <div>
          {node.children.map(child => (
            <DepartmentRow
              key={child.id}
              node={child}
              level={level + 1}
              isOpen={openIds.has(child.id)}
              openIds={openIds}
              onToggle={onToggle}
              onEditDept={onEditDept}
              onDeleteDept={onDeleteDept}
              onAddChildDept={onAddChildDept}
              onAddEmp={onAddEmp}
              onEditEmp={onEditEmp}
              onDeleteEmp={onDeleteEmp}
            />
          ))}
          {node.employees.length > 0 && (
            <div style={{ paddingLeft: (level + 1) * 16 }}>
              {node.employees.map(emp => (
                <EmployeeRow key={emp.id} emp={emp} onEdit={onEditEmp} onDelete={onDeleteEmp} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export function OrgTreeView({
  tree, searchQuery, onEditDepartment, onDeleteDepartment, onAddChildDepartment, onAddEmployee, onEditEmployee, onDeleteEmployee,
}: OrgTreeViewProps) {
  const [openDeptIds, setOpenDeptIds] = useState<Set<string>>(new Set());

  const filteredTree = useMemo(
    () => searchQuery?.trim() ? filterOrgTree(tree, searchQuery) : tree,
    [tree, searchQuery]
  );

  // When searching, auto-expand all
  const effectiveOpenIds = useMemo(() => {
    if (searchQuery?.trim()) {
      const allIds = new Set<string>();
      function collectIds(nodes: OrgDepartmentNode[]) {
        for (const n of nodes) { allIds.add(n.id); collectIds(n.children); }
      }
      collectIds(filteredTree);
      return allIds;
    }
    return openDeptIds;
  }, [searchQuery, filteredTree, openDeptIds]);

  const handleToggle = useCallback((id: string) => {
    setOpenDeptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    function collect(nodes: OrgDepartmentNode[]) {
      for (const n of nodes) { allIds.add(n.id); collect(n.children); }
    }
    collect(tree);
    setOpenDeptIds(allIds);
  }, [tree]);

  const collapseAll = useCallback(() => setOpenDeptIds(new Set()), []);

  if (filteredTree.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-8 text-muted-foreground">
        <Folder className="w-8 h-8 opacity-40" />
        <p className="text-sm">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-2 pb-2 border-b">
        <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7 px-2">Развернуть все</Button>
        <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7 px-2">Свернуть все</Button>
      </div>
      <div className="space-y-0.5">
        {filteredTree.map(node => (
          <DepartmentRow
            key={node.id}
            node={node}
            level={0}
            isOpen={effectiveOpenIds.has(node.id)}
            openIds={effectiveOpenIds}
            onToggle={handleToggle}
            onEditDept={onEditDepartment}
            onDeleteDept={onDeleteDepartment}
            onAddChildDept={onAddChildDepartment}
            onAddEmp={onAddEmployee}
            onEditEmp={onEditEmployee}
            onDeleteEmp={onDeleteEmployee}
          />
        ))}
      </div>
    </div>
  );
}
