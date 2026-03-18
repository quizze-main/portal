import type { AdminDepartment, AdminEmployee } from './internalApiClient';

export interface OrgDepartmentNode {
  type: 'department';
  id: string;
  label: string;
  storeId?: string;
  parentId?: string;
  children: OrgDepartmentNode[];
  employees: OrgEmployeeNode[];
  employeeCount: number;
}

export interface OrgEmployeeNode {
  type: 'employee';
  id: string;
  name: string;
  designation?: string;
  tgUsername?: string;
  email?: string;
  image?: string;
  reportsTo?: string;
  reportsToName?: string;
  isManager: boolean;
  department?: string;
}

const FRAPPE_ROOT_NAMES = ['all departments', 'все департаменты'];

function isFrappeRoot(dept: AdminDepartment): boolean {
  const n = (dept.department_name || dept.name || '').toLowerCase();
  return FRAPPE_ROOT_NAMES.some(r => n.includes(r)) && !dept.parent_department;
}

export function buildOrgTree(
  departments: AdminDepartment[],
  employees: AdminEmployee[]
): OrgDepartmentNode[] {
  // 1. Map departments, skip Frappe root
  const deptMap = new Map<string, AdminDepartment>();
  let rootParentName: string | undefined;
  for (const d of departments) {
    if (isFrappeRoot(d)) {
      rootParentName = d.name;
      continue;
    }
    deptMap.set(d.name, d);
  }

  // 2. Group employees by department
  const empByDept = new Map<string, AdminEmployee[]>();
  for (const emp of employees) {
    const key = emp.department || '__unassigned__';
    const list = empByDept.get(key) || [];
    list.push(emp);
    empByDept.set(key, list);
  }

  // 3. Build employee name lookup for reports_to resolution
  const empNameMap = new Map<string, string>();
  for (const emp of employees) {
    empNameMap.set(emp.name, emp.employee_name || emp.first_name || emp.name);
  }

  // 4. Determine managers per department
  function getManagerIds(deptEmployees: AdminEmployee[]): Set<string> {
    const ids = new Set<string>();
    for (const emp of deptEmployees) {
      if (emp.reports_to) ids.add(emp.reports_to);
    }
    return ids;
  }

  // 5. Convert employees to OrgEmployeeNode
  function toEmployeeNodes(deptEmployees: AdminEmployee[]): OrgEmployeeNode[] {
    const managerIds = getManagerIds(deptEmployees);
    return deptEmployees
      .map(emp => ({
        type: 'employee' as const,
        id: emp.name,
        name: emp.employee_name || emp.first_name || emp.name,
        designation: emp.designation,
        tgUsername: emp.custom_tg_username,
        email: emp.company_email,
        image: emp.image,
        reportsTo: emp.reports_to || undefined,
        reportsToName: emp.reports_to ? empNameMap.get(emp.reports_to) : undefined,
        isManager: managerIds.has(emp.name),
        department: emp.department,
      }))
      .sort((a, b) => {
        if (a.isManager !== b.isManager) return a.isManager ? -1 : 1;
        return a.name.localeCompare(b.name, 'ru');
      });
  }

  // 6. Build tree nodes
  const nodeMap = new Map<string, OrgDepartmentNode>();
  for (const [id, dept] of deptMap) {
    const deptEmps = empByDept.get(id) || [];
    nodeMap.set(id, {
      type: 'department',
      id,
      label: dept.department_name || id,
      storeId: dept.custom_store_id,
      parentId: dept.parent_department,
      children: [],
      employees: toEmployeeNodes(deptEmps),
      employeeCount: 0,
    });
  }

  // 7. Link children to parents (with cycle protection)
  const roots: OrgDepartmentNode[] = [];
  for (const node of nodeMap.values()) {
    const parentId = node.parentId;
    if (!parentId || parentId === rootParentName || !nodeMap.has(parentId)) {
      roots.push(node);
    } else {
      nodeMap.get(parentId)!.children.push(node);
    }
  }

  // 8. Sort children alphabetically
  function sortChildren(nodes: OrgDepartmentNode[]) {
    nodes.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    for (const n of nodes) sortChildren(n.children);
  }
  sortChildren(roots);

  // 9. Compute employeeCount recursively
  function computeCount(node: OrgDepartmentNode): number {
    let count = node.employees.length;
    for (const child of node.children) {
      count += computeCount(child);
    }
    node.employeeCount = count;
    return count;
  }
  for (const root of roots) computeCount(root);

  // 10. Unassigned employees virtual node
  const unassigned = empByDept.get('__unassigned__');
  if (unassigned?.length) {
    roots.push({
      type: 'department',
      id: '__unassigned__',
      label: 'Без департамента',
      children: [],
      employees: toEmployeeNodes(unassigned),
      employeeCount: unassigned.length,
    });
  }

  return roots;
}

export function filterOrgTree(
  roots: OrgDepartmentNode[],
  query: string
): OrgDepartmentNode[] {
  if (!query.trim()) return roots;
  const q = query.toLowerCase();

  function matches(node: OrgDepartmentNode): OrgDepartmentNode | null {
    const labelMatch = node.label.toLowerCase().includes(q);
    const matchingEmps = node.employees.filter(
      e => e.name.toLowerCase().includes(q) ||
           (e.designation || '').toLowerCase().includes(q) ||
           (e.tgUsername || '').toLowerCase().includes(q)
    );
    const matchingChildren = node.children
      .map(c => matches(c))
      .filter(Boolean) as OrgDepartmentNode[];

    if (!labelMatch && matchingEmps.length === 0 && matchingChildren.length === 0) {
      return null;
    }

    return {
      ...node,
      children: matchingChildren,
      employees: labelMatch ? node.employees : matchingEmps,
      employeeCount: (labelMatch ? node.employees.length : matchingEmps.length) +
        matchingChildren.reduce((sum, c) => sum + c.employeeCount, 0),
    };
  }

  return roots.map(r => matches(r)).filter(Boolean) as OrgDepartmentNode[];
}

export function getAllDescendantIds(
  departmentId: string,
  departments: AdminDepartment[]
): Set<string> {
  const result = new Set<string>();
  const childrenOf = new Map<string, string[]>();
  for (const d of departments) {
    if (d.parent_department) {
      const list = childrenOf.get(d.parent_department) || [];
      list.push(d.name);
      childrenOf.set(d.parent_department, list);
    }
  }
  function collect(id: string) {
    const children = childrenOf.get(id) || [];
    for (const childId of children) {
      if (!result.has(childId)) {
        result.add(childId);
        collect(childId);
      }
    }
  }
  collect(departmentId);
  return result;
}
