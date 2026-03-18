import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LoovisStoreOption } from '@/lib/internalApiClient';

export interface ManagerOption {
  id: string;
  name: string;
  avatar?: string;
  designation?: string;
}

/** Build same-origin proxy URL for employee photo (avoids CORS/Frappe auth issues). */
function getEmployeeImageUrl(employeeId: string, image?: string): string {
  if (!employeeId) return image || '';
  const v = image ? encodeURIComponent(String(image)) : '';
  return `/api/frappe/employees/${encodeURIComponent(employeeId)}/image${v ? `?v=${v}` : ''}`;
}

interface BranchManagerSelectorProps {
  branches: LoovisStoreOption[];
  managers: ManagerOption[];
  currentBranchId: string;
  currentManagerId: string;
  onBranchChange: (branchId: string) => void;
  onManagerChange: (managerId: string) => void;
  managersLoading?: boolean;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function BranchManagerSelector({
  branches,
  managers,
  currentBranchId,
  currentManagerId,
  onBranchChange,
  onManagerChange,
  managersLoading,
}: BranchManagerSelectorProps) {
  const currentManager = useMemo(
    () => managers.find(m => m.id === currentManagerId),
    [managers, currentManagerId],
  );

  return (
    <div className="flex gap-2">
      {/* Branch selector */}
      <Select value={currentBranchId} onValueChange={onBranchChange}>
        <SelectTrigger className="h-9 text-xs flex-1 min-w-0">
          <SelectValue placeholder="Филиал" />
        </SelectTrigger>
        <SelectContent>
          {branches.map(b => (
            <SelectItem key={b.store_id} value={b.store_id}>
              <span className="text-xs truncate">{b.name || b.store_id}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Manager selector */}
      <Select
        value={currentManagerId}
        onValueChange={onManagerChange}
        disabled={managersLoading || managers.length === 0}
      >
        <SelectTrigger className="h-9 text-xs flex-1 min-w-0 [&>span]:!flex [&>span]:!items-center [&>span]:!gap-1.5 [&>span]:!overflow-hidden">
          {currentManager ? (
            <span className="flex items-center gap-1.5 overflow-hidden">
              <Avatar className="w-5 h-5 shrink-0">
                <AvatarImage src={getEmployeeImageUrl(currentManager.id, currentManager.avatar)} alt={currentManager.name} />
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {getInitials(currentManager.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{currentManager.name}</span>
            </span>
          ) : (
            <SelectValue placeholder={managersLoading ? 'Загрузка...' : 'Менеджер'} />
          )}
        </SelectTrigger>
        <SelectContent>
          {managers.map(m => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex items-center gap-2 text-xs">
                <Avatar className="w-5 h-5 shrink-0">
                  <AvatarImage src={getEmployeeImageUrl(m.id, m.avatar)} alt={m.name} />
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {getInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{m.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
