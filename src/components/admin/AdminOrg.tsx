import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, User, FolderPlus, UserPlus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminOrg } from '@/hooks/useAdminOrg';
import { useAdminOrgTree } from '@/hooks/useAdminOrgTree';
import { internalApiClient } from '@/lib/internalApiClient';
import type { CreateDepartmentParams, UpdateDepartmentParams, CreateEmployeeParams, UpdateEmployeeParams } from '@/lib/internalApiClient';
import type { OrgDepartmentNode, OrgEmployeeNode } from '@/lib/orgTreeBuilder';
import { OrgTreeView } from './OrgTreeView';
import { OrgChartView } from './OrgChartView';
import { DepartmentFormSheet } from './DepartmentFormSheet';
import { EmployeeFormSheet } from './EmployeeFormSheet';
import { AdminOrgSettings } from './AdminOrgSettings';

// ── Types ──
type DeptSheetState =
  | { open: false }
  | { open: true; mode: 'create'; parent?: { id: string; label: string } }
  | { open: true; mode: 'edit'; dept: { id: string; label: string; storeId?: string; parentId?: string } };

type EmpSheetState =
  | { open: false }
  | { open: true; mode: 'create'; department?: string }
  | { open: true; mode: 'edit'; employee: any };

type DeleteState =
  | { open: false }
  | { open: true; type: 'department'; id: string; label: string }
  | { open: true; type: 'employee'; id: string; label: string };

export const AdminOrg: React.FC = () => {
  // ── Existing search hook (for Search tab) ──
  const searchHook = useAdminOrg();

  // ── New tree hook ──
  const orgTree = useAdminOrgTree();

  // ── Tree search ──
  const [treeSearch, setTreeSearch] = useState('');

  // ── Sheet states ──
  const [deptSheet, setDeptSheet] = useState<DeptSheetState>({ open: false });
  const [empSheet, setEmpSheet] = useState<EmpSheetState>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<DeleteState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Department handlers ──
  const handleAddDepartment = useCallback(() => {
    setDeptSheet({ open: true, mode: 'create' });
  }, []);

  const handleAddChildDepartment = useCallback((parent: OrgDepartmentNode) => {
    setDeptSheet({ open: true, mode: 'create', parent: { id: parent.id, label: parent.label } });
  }, []);

  const handleEditDepartment = useCallback((dept: OrgDepartmentNode) => {
    setDeptSheet({
      open: true,
      mode: 'edit',
      dept: { id: dept.id, label: dept.label, storeId: dept.storeId, parentId: dept.parentId },
    });
  }, []);

  const handleDeleteDepartment = useCallback((dept: OrgDepartmentNode) => {
    setDeleteDialog({ open: true, type: 'department', id: dept.id, label: dept.label });
  }, []);

  const handleDeptSubmit = useCallback(async (data: CreateDepartmentParams | UpdateDepartmentParams) => {
    setIsSubmitting(true);
    try {
      if (deptSheet.open && deptSheet.mode === 'create') {
        await orgTree.createDepartment.mutateAsync(data as CreateDepartmentParams);
        toast.success('Департамент создан');
      } else if (deptSheet.open && deptSheet.mode === 'edit') {
        await orgTree.updateDepartment.mutateAsync({ id: deptSheet.dept.id, data: data as UpdateDepartmentParams });
        toast.success('Департамент обновлён');
      }
      setDeptSheet({ open: false });
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка при сохранении департамента');
    } finally {
      setIsSubmitting(false);
    }
  }, [deptSheet, orgTree.createDepartment, orgTree.updateDepartment]);

  // ── Employee handlers ──
  const handleAddEmployee = useCallback((dept?: OrgDepartmentNode) => {
    setEmpSheet({ open: true, mode: 'create', department: dept?.id });
  }, []);

  const handleEditEmployee = useCallback((emp: OrgEmployeeNode) => {
    // Find full employee data from rawData
    const fullEmp = orgTree.rawData?.employees.find(e => e.name === emp.id);
    if (fullEmp) {
      setEmpSheet({ open: true, mode: 'edit', employee: fullEmp });
    }
  }, [orgTree.rawData]);

  const handleDeleteEmployee = useCallback((emp: OrgEmployeeNode) => {
    setDeleteDialog({ open: true, type: 'employee', id: emp.id, label: emp.name });
  }, []);

  const handleEmpSubmit = useCallback(async (data: CreateEmployeeParams | UpdateEmployeeParams) => {
    setIsSubmitting(true);
    try {
      if (empSheet.open && empSheet.mode === 'create') {
        await orgTree.createEmployee.mutateAsync(data as CreateEmployeeParams);
        toast.success('Сотрудник создан');
      } else if (empSheet.open && empSheet.mode === 'edit') {
        await orgTree.updateEmployee.mutateAsync({ id: empSheet.employee.name, data: data as UpdateEmployeeParams });
        toast.success('Сотрудник обновлён');
      }
      setEmpSheet({ open: false });
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка при сохранении сотрудника');
    } finally {
      setIsSubmitting(false);
    }
  }, [empSheet, orgTree.createEmployee, orgTree.updateEmployee]);

  // ── Delete confirmation ──
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.open) return;
    setIsSubmitting(true);
    try {
      if (deleteDialog.type === 'department') {
        await orgTree.deleteDepartment.mutateAsync(deleteDialog.id);
        toast.success('Департамент удалён');
      } else {
        await orgTree.deleteEmployee.mutateAsync(deleteDialog.id);
        toast.success('Сотрудник деактивирован');
      }
      setDeleteDialog({ open: false });
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка при удалении');
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteDialog, orgTree.deleteDepartment, orgTree.deleteEmployee]);

  // Stats for the summary bar
  const deptCount = orgTree.rawData?.departments?.length || 0;
  const empCount = orgTree.rawData?.employees?.length || 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddDepartment}>
            <FolderPlus className="w-4 h-4 mr-1.5" /> Департамент
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddEmployee()}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Сотрудник
          </Button>
        </div>
        {!orgTree.isLoading && !orgTree.isError && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{deptCount} департ.</span>
            <span>{empCount} сотруд.</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree">Дерево</TabsTrigger>
          <TabsTrigger value="chart">Орг-чарт</TabsTrigger>
          <TabsTrigger value="search">Поиск</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Настройки
          </TabsTrigger>
        </TabsList>

        {/* ── Tree Tab ── */}
        <TabsContent value="tree" className="mt-3">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск в дереве..."
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {orgTree.isLoading && (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            )}

            {orgTree.isError && (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-sm text-red-500">Ошибка загрузки орг. структуры</p>
                <Button variant="outline" size="sm" onClick={() => orgTree.refetch()}>
                  Повторить
                </Button>
              </div>
            )}

            {!orgTree.isLoading && !orgTree.isError && (
              <OrgTreeView
                tree={orgTree.tree}
                searchQuery={treeSearch}
                onEditDepartment={handleEditDepartment}
                onDeleteDepartment={handleDeleteDepartment}
                onAddChildDepartment={handleAddChildDepartment}
                onAddEmployee={handleAddEmployee}
                onEditEmployee={handleEditEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            )}
          </div>
        </TabsContent>

        {/* ── Chart Tab ── */}
        <TabsContent value="chart" className="mt-3">
          <div
            className="rounded-lg border bg-card overflow-hidden relative"
            style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
          >
            {orgTree.isLoading && (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            )}

            {orgTree.isError && (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-sm text-red-500">Ошибка загрузки орг. структуры</p>
                <Button variant="outline" size="sm" onClick={() => orgTree.refetch()}>
                  Повторить
                </Button>
              </div>
            )}

            {!orgTree.isLoading && !orgTree.isError && (
              <OrgChartView tree={orgTree.tree} />
            )}
          </div>
        </TabsContent>

        {/* ── Search Tab (existing functionality) ── */}
        <TabsContent value="search" className="mt-3">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени..."
                  value={searchHook.searchQuery}
                  onChange={(e) => searchHook.setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select
                value={searchHook.selectedDepartment || '__all__'}
                onValueChange={(val) => searchHook.setSelectedDepartment(val === '__all__' ? '' : val)}
              >
                <SelectTrigger className="w-full sm:w-[220px] h-9">
                  <SelectValue placeholder="Все департаменты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Все департаменты</SelectItem>
                  {searchHook.departments.data?.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.department_name || d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {searchHook.employees.isLoading && (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            )}

            {searchHook.employees.isError && (
              <p className="text-sm text-red-500">Ошибка загрузки сотрудников</p>
            )}

            {searchHook.employees.data && searchHook.employees.data.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Сотрудники не найдены</p>
            )}

            {searchHook.employees.data && searchHook.employees.data.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {searchHook.employees.data.map((emp) => (
                    <div
                      key={emp.name || emp.user_id}
                      className="rounded-lg border p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      {emp.image ? (
                        <img
                          src={internalApiClient.getEmployeeImageUrl(emp.name || emp.user_id)}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 ${emp.image ? 'hidden' : ''}`}
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{emp.employee_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {emp.designation && <span>{emp.designation}</span>}
                          {emp.department && <span>{emp.department}</span>}
                        </div>
                      </div>
                      {emp.custom_tg_username && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          @{emp.custom_tg_username}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={searchHook.loadMore}
                    disabled={searchHook.employees.isFetching}
                  >
                    {searchHook.employees.isFetching ? (
                      <Spinner size="sm" />
                    ) : (
                      'Показать ещё'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="mt-3">
          <AdminOrgSettings />
        </TabsContent>
      </Tabs>

      {/* ── Department Form Sheet ── */}
      <DepartmentFormSheet
        open={deptSheet.open}
        onOpenChange={(open) => !open && setDeptSheet({ open: false })}
        mode={deptSheet.open ? deptSheet.mode : 'create'}
        department={
          deptSheet.open
            ? deptSheet.mode === 'edit'
              ? deptSheet.dept
              : deptSheet.parent ? { id: deptSheet.parent.id, label: deptSheet.parent.label } : null
            : null
        }
        allDepartments={orgTree.rawData?.departments || []}
        onSubmit={handleDeptSubmit}
        isSubmitting={isSubmitting}
      />

      {/* ── Employee Form Sheet ── */}
      <EmployeeFormSheet
        open={empSheet.open}
        onOpenChange={(open) => !open && setEmpSheet({ open: false })}
        mode={empSheet.open ? empSheet.mode : 'create'}
        employee={empSheet.open && empSheet.mode === 'edit' ? empSheet.employee : null}
        departments={orgTree.rawData?.departments || []}
        employees={orgTree.rawData?.employees || []}
        onSubmit={handleEmpSubmit}
        isSubmitting={isSubmitting}
        preselectedDepartment={empSheet.open && empSheet.mode === 'create' ? empSheet.department : undefined}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.open && deleteDialog.type === 'department' ? 'Удалить департамент?' : 'Деактивировать сотрудника?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.open && deleteDialog.type === 'department'
                ? `Департамент "${deleteDialog.label}" будет удалён. Если в нём есть сотрудники или подразделения, удаление будет отклонено.`
                : `Сотрудник "${deleteDialog.open ? deleteDialog.label : ''}" будет деактивирован (статус "Left").`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Удаление...' : 'Подтвердить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
