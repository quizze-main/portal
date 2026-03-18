import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminDepartment, AdminEmployee, CreateEmployeeParams, UpdateEmployeeParams } from '@/lib/internalApiClient';

interface EmployeeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  employee?: AdminEmployee | null;
  departments: AdminDepartment[];
  employees: AdminEmployee[];
  onSubmit: (data: CreateEmployeeParams | UpdateEmployeeParams) => Promise<void>;
  isSubmitting: boolean;
  preselectedDepartment?: string;
}

export const EmployeeFormSheet: React.FC<EmployeeFormSheetProps> = ({
  open, onOpenChange, mode, employee, departments, employees, onSubmit, isSubmitting, preselectedDepartment,
}) => {
  const [firstName, setFirstName] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [tgUsername, setTgUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [doj, setDoj] = useState(new Date().toISOString().split('T')[0]);
  const [gender, setGender] = useState('');

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && employee) {
        setFirstName(employee.first_name || '');
        setEmployeeName(employee.employee_name || '');
        setDesignation(employee.designation || '');
        setDepartment(employee.department || '');
        setReportsTo(employee.reports_to || '');
        setTgUsername(employee.custom_tg_username || '');
        setEmail(employee.company_email || '');
        setDob(employee.date_of_birth || '');
        setDoj(employee.date_of_joining || '');
        setGender(employee.gender || '');
      } else {
        setFirstName('');
        setEmployeeName('');
        setDesignation('');
        setDepartment(preselectedDepartment || '');
        setReportsTo('');
        setTgUsername('');
        setEmail('');
        setDob('');
        setDoj(new Date().toISOString().split('T')[0]);
        setGender('');
      }
    }
  }, [open, mode, employee, preselectedDepartment]);

  // Filter employees for reports_to dropdown
  const potentialManagers = employees.filter(e =>
    mode === 'edit' ? e.name !== employee?.name : true
  );

  const handleSubmit = async () => {
    if (mode === 'create') {
      if (!firstName.trim() || !dob || !doj || !gender) return;
      await onSubmit({
        first_name: firstName.trim(),
        employee_name: employeeName.trim() || undefined,
        designation: designation || undefined,
        department: department || undefined,
        reports_to: reportsTo || undefined,
        custom_tg_username: tgUsername || undefined,
        company_email: email || undefined,
        date_of_birth: dob,
        date_of_joining: doj,
        gender,
      } as CreateEmployeeParams);
    } else {
      await onSubmit({
        employee_name: employeeName.trim() || undefined,
        first_name: firstName.trim() || undefined,
        designation: designation || undefined,
        department: department || undefined,
        reports_to: reportsTo || undefined,
        custom_tg_username: tgUsername || undefined,
        company_email: email || undefined,
        date_of_birth: dob || undefined,
        date_of_joining: doj || undefined,
        gender: gender || undefined,
      } as UpdateEmployeeParams);
    }
  };

  const isCreateValid = mode === 'create' ? !!(firstName.trim() && dob && doj && gender) : !!firstName.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[480px] flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0">
          <SheetTitle>{mode === 'create' ? 'Новый сотрудник' : 'Редактирование сотрудника'}</SheetTitle>
          <SheetDescription className="sr-only">
            {mode === 'create' ? 'Создание нового сотрудника' : 'Редактирование существующего сотрудника'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-4 flex-1 overflow-auto">
          <div className="space-y-2">
            <Label>Имя *</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Имя" />
          </div>

          <div className="space-y-2">
            <Label>Полное имя</Label>
            <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Фамилия Имя Отчество" />
          </div>

          <div className="space-y-2">
            <Label>Должность</Label>
            <Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Должность" />
          </div>

          <div className="space-y-2">
            <Label>Департамент</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Не указан</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.name} value={d.name}>
                    {d.department_name || d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Руководитель</Label>
            <Select value={reportsTo} onValueChange={setReportsTo}>
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Не указан</SelectItem>
                {potentialManagers.map(e => (
                  <SelectItem key={e.name} value={e.name}>
                    {e.employee_name || e.first_name || e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Telegram</Label>
            <Input value={tgUsername} onChange={e => setTgUsername(e.target.value)} placeholder="@username" />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" />
          </div>

          <div className="space-y-2">
            <Label>Дата рождения{mode === 'create' ? ' *' : ''}</Label>
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Дата приёма{mode === 'create' ? ' *' : ''}</Label>
            <Input type="date" value={doj} onChange={e => setDoj(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Пол{mode === 'create' ? ' *' : ''}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Мужской</SelectItem>
                <SelectItem value="Female">Женский</SelectItem>
                <SelectItem value="Other">Другой</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isCreateValid}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
