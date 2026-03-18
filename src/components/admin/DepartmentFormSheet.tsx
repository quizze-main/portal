import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminDepartment, CreateDepartmentParams, UpdateDepartmentParams } from '@/lib/internalApiClient';
import { getAllDescendantIds } from '@/lib/orgTreeBuilder';

interface DepartmentFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  department?: { id: string; label: string; storeId?: string; parentId?: string } | null;
  allDepartments: AdminDepartment[];
  onSubmit: (data: CreateDepartmentParams | UpdateDepartmentParams) => Promise<void>;
  isSubmitting: boolean;
}

export const DepartmentFormSheet: React.FC<DepartmentFormSheetProps> = ({
  open, onOpenChange, mode, department, allDepartments, onSubmit, isSubmitting,
}) => {
  const [name, setName] = useState('');
  const [parentDept, setParentDept] = useState<string>('');
  const [storeId, setStoreId] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && department) {
        setName(department.label || '');
        setParentDept(department.parentId || '');
        setStoreId(department.storeId || '');
        setIsGroup(false);
      } else {
        setName('');
        setParentDept(department?.id || ''); // pre-fill parent when adding child
        setStoreId('');
        setIsGroup(false);
      }
    }
  }, [open, mode, department]);

  // Filter out self and descendants for parent dropdown
  const availableParents = allDepartments.filter(d => {
    if (mode === 'edit' && department) {
      if (d.name === department.id) return false;
      const descendants = getAllDescendantIds(department.id, allDepartments);
      if (descendants.has(d.name)) return false;
    }
    return true;
  });

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSubmit({
      department_name: name.trim(),
      parent_department: parentDept || undefined,
      custom_store_id: storeId || undefined,
      ...(mode === 'create' ? { is_group: isGroup ? 1 : 0 } : {}),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Новый департамент' : 'Редактирование департамента'}</SheetTitle>
          <SheetDescription className="sr-only">
            {mode === 'create' ? 'Создание нового департамента' : 'Редактирование существующего департамента'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Название департамента" />
          </div>

          <div className="space-y-2">
            <Label>Родительский департамент</Label>
            <Select value={parentDept} onValueChange={setParentDept}>
              <SelectTrigger>
                <SelectValue placeholder="Нет (корневой)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Нет (корневой)</SelectItem>
                {availableParents.map(d => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.department_name || d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Store ID (Loovis)</Label>
            <Input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="Опционально" />
          </div>

          {mode === 'create' && (
            <div className="flex items-center gap-2">
              <Switch checked={isGroup} onCheckedChange={setIsGroup} id="is-group" />
              <Label htmlFor="is-group">Может содержать подразделения</Label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
