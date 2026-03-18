import React, { useState, useCallback, useEffect } from 'react';
import { useAdminDataSources } from '@/hooks/useAdminDataSources';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  X,
  Loader2,
  Link2,
  Building2,
  User,
} from 'lucide-react';
import type {
  DataSourceConfig,
  DataSourceAuthType,
  DataSourcePaginationType,
  DataSourceAuthTypeDef,
  DataSourcePaginationTypeDef,
  DataSourceRequestResult,
  FieldMapping,
  FieldMappingEntityType,
} from '@/lib/internalApiClient';
import { internalApiClient } from '@/lib/internalApiClient';
import { Briefcase, Settings } from 'lucide-react';
import { DataSourceEditDialog } from './DataSourceEditDialog';
import { getAllBranchesWithStoreIds } from '@/data/branchStoreMapping';

const ENTITY_TYPE_LABELS: Record<FieldMappingEntityType, string> = {
  branch: 'Филиал',
  employee: 'Сотрудник',
  department: 'Отдел',
  designation: 'Должность',
  custom: 'Произвольное',
};

function entityTypeIcon(type: FieldMappingEntityType) {
  switch (type) {
    case 'branch': return <Building2 className="w-3.5 h-3.5 text-blue-500" />;
    case 'employee': return <User className="w-3.5 h-3.5 text-green-500" />;
    case 'department': return <Building2 className="w-3.5 h-3.5 text-purple-500" />;
    case 'designation': return <Briefcase className="w-3.5 h-3.5 text-orange-500" />;
    case 'custom': return <Settings className="w-3.5 h-3.5 text-gray-500" />;
  }
}

// ─── Types ───

export interface DataSourceFormData {
  id: string;
  label: string;
  baseUrl: string;
  authType: DataSourceAuthType;
  authConfig: Record<string, string>;
  paginationType: DataSourcePaginationType;
  paginationConfig: Record<string, string>;
  healthCheckPath: string;
  healthCheckMethod: string;
  timeout: number;
  enabled: boolean;
  fieldMappings: FieldMapping[];
}

const emptyForm: DataSourceFormData = {
  id: '',
  label: '',
  baseUrl: '',
  authType: 'none',
  authConfig: {},
  paginationType: 'none',
  paginationConfig: {},
  healthCheckPath: '/',
  healthCheckMethod: 'GET',
  timeout: 10000,
  enabled: true,
  fieldMappings: [],
};

export function dsToForm(s: DataSourceConfig): DataSourceFormData {
  return {
    id: s.id,
    label: s.label,
    baseUrl: s.baseUrl,
    authType: s.authType,
    authConfig: { ...s.authConfig },
    paginationType: s.paginationType,
    paginationConfig: { ...s.paginationConfig },
    healthCheckPath: s.healthCheckPath || '/',
    healthCheckMethod: s.healthCheckMethod || 'GET',
    timeout: s.timeout || 10000,
    enabled: s.enabled,
    fieldMappings: (s.fieldMappings || []).map(fm => ({
      ...fm,
      values: { ...fm.values },
    })),
  };
}

// ─── Dynamic fields renderer ───

export function DynamicFields({
  fields,
  values,
  onChange,
}: {
  fields: { key: string; label: string; placeholder?: string; secret?: boolean; default?: string }[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  if (!fields || fields.length === 0) return null;
  return (
    <div className="space-y-2">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
          <Input
            type={f.secret ? 'password' : 'text'}
            value={values[f.key] || ''}
            onChange={e => onChange({ ...values, [f.key]: e.target.value })}
            placeholder={f.placeholder || f.default || ''}
            className="text-xs h-8"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Data Mapping section ───

interface EmployeeInfo {
  name: string;
  employee_name: string;
  custom_itigris_user_id?: string;
  department?: string;
}

interface DepartmentInfo {
  name: string;
  department_name: string;
  custom_store_id?: string;
  parent_department?: string;
}

interface DesignationInfo {
  name: string;
}

export function DataSourceFieldMappings({
  fieldMappings,
  onChange,
}: {
  fieldMappings: FieldMapping[];
  onChange: (fms: FieldMapping[]) => void;
}) {
  const branches = getAllBranchesWithStoreIds();
  const [employees, setEmployees] = useState<EmployeeInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [designations, setDesignations] = useState<DesignationInfo[]>([]);
  const [loadedTypes, setLoadedTypes] = useState<Set<string>>(new Set());
  const [addingNew, setAddingNew] = useState(false);
  const [newApiField, setNewApiField] = useState('');
  const [newEntityType, setNewEntityType] = useState<FieldMappingEntityType>('branch');
  const [newLabel, setNewLabel] = useState('');
  const [customKeyInput, setCustomKeyInput] = useState<Record<number, string>>({});

  // Lazy-load entity data when needed
  useEffect(() => {
    const neededTypes = new Set(fieldMappings.map(fm => fm.entityType));
    if (addingNew) neededTypes.add(newEntityType);

    if (neededTypes.has('employee') && !loadedTypes.has('employee')) {
      setLoadedTypes(prev => new Set([...prev, 'employee']));
      internalApiClient.getEmployeesWithExternalIds()
        .then(data => setEmployees(data)).catch(() => {});
    }
    if (neededTypes.has('department') && !loadedTypes.has('department')) {
      setLoadedTypes(prev => new Set([...prev, 'department']));
      internalApiClient.getDepartments()
        .then(data => setDepartments(data)).catch(() => {});
    }
    if (neededTypes.has('designation') && !loadedTypes.has('designation')) {
      setLoadedTypes(prev => new Set([...prev, 'designation']));
      internalApiClient.getDesignations()
        .then(data => setDesignations(data)).catch(() => {});
    }
  }, [fieldMappings, addingNew, newEntityType, loadedTypes]);

  const addMapping = () => {
    if (!newApiField.trim()) return;
    const id = newApiField.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32) + '_' + Date.now();
    const values: Record<string, string> = {};
    if (newEntityType === 'branch') {
      branches.forEach(b => { values[b.storeId] = ''; });
    } else if (newEntityType === 'department') {
      departments.forEach(d => { values[d.name] = ''; });
    } else if (newEntityType === 'designation') {
      designations.forEach(d => { values[d.name] = ''; });
    }
    onChange([...fieldMappings, { id, apiField: newApiField, entityType: newEntityType, label: newLabel || newApiField, values }]);
    setAddingNew(false);
    setNewApiField('');
    setNewLabel('');
  };

  const updateValue = (idx: number, entityId: string, value: string) => {
    const updated = fieldMappings.map((fm, i) => i === idx ? { ...fm, values: { ...fm.values, [entityId]: value } } : fm);
    onChange(updated);
  };

  const removeMapping = (idx: number) => {
    onChange(fieldMappings.filter((_, i) => i !== idx));
  };

  const addEntityToMapping = (idx: number, entityId: string) => {
    if (!entityId) return;
    const updated = fieldMappings.map((fm, i) => i === idx ? { ...fm, values: { ...fm.values, [entityId]: '' } } : fm);
    onChange(updated);
  };

  const removeEntityFromMapping = (idx: number, entityId: string) => {
    const fm = fieldMappings[idx];
    const newValues = { ...fm.values };
    delete newValues[entityId];
    onChange(fieldMappings.map((f, i) => i === idx ? { ...f, values: newValues } : f));
  };

  const addCustomKey = (idx: number) => {
    const key = customKeyInput[idx]?.trim();
    if (!key) return;
    addEntityToMapping(idx, key);
    setCustomKeyInput(prev => ({ ...prev, [idx]: '' }));
  };

  // Render value rows for a mapping based on its entityType
  const renderRows = (mapping: FieldMapping, idx: number) => {
    switch (mapping.entityType) {
      case 'branch':
        return branches.map(branch => (
          <div key={branch.storeId} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-1 items-center">
            <span className="text-xs truncate">{branch.name}</span>
            <code className="text-[10px] text-muted-foreground font-mono w-28 text-center">{branch.storeId}</code>
            <Input
              value={mapping.values[branch.storeId] || ''}
              onChange={e => updateValue(idx, branch.storeId, e.target.value)}
              placeholder="—"
              className="text-xs h-7"
            />
          </div>
        ));

      case 'department':
        return departments.map(dept => (
          <div key={dept.name} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-1 items-center">
            <span className="text-xs truncate">{dept.department_name || dept.name}</span>
            <code className="text-[10px] text-muted-foreground font-mono w-28 text-center truncate">{dept.name}</code>
            <Input
              value={mapping.values[dept.name] || ''}
              onChange={e => updateValue(idx, dept.name, e.target.value)}
              placeholder="—"
              className="text-xs h-7"
            />
          </div>
        ));

      case 'designation':
        return designations.map(desig => (
          <div key={desig.name} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-1 items-center">
            <span className="text-xs truncate">{desig.name}</span>
            <code className="text-[10px] text-muted-foreground font-mono w-28 text-center truncate">{desig.name}</code>
            <Input
              value={mapping.values[desig.name] || ''}
              onChange={e => updateValue(idx, desig.name, e.target.value)}
              placeholder="—"
              className="text-xs h-7"
            />
          </div>
        ));

      case 'employee':
        return (
          <>
            {Object.keys(mapping.values).map(empId => {
              const emp = employees.find(e => e.name === empId);
              return (
                <div key={empId} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-3 py-1 items-center">
                  <span className="text-xs truncate">{emp?.employee_name || empId}</span>
                  <code className="text-[10px] text-muted-foreground font-mono w-28 text-center">{empId}</code>
                  <Input
                    value={mapping.values[empId] || ''}
                    onChange={e => updateValue(idx, empId, e.target.value)}
                    placeholder="—"
                    className="text-xs h-7"
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeEntityFromMapping(idx, empId)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
            <div className="px-3 py-2">
              <Select value="" onValueChange={v => addEntityToMapping(idx, v)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="+ Добавить сотрудника..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => !mapping.values.hasOwnProperty(e.name))
                    .map(e => (
                      <SelectItem key={e.name} value={e.name}>
                        {e.employee_name} ({e.name}){e.custom_itigris_user_id ? ` — itg: ${e.custom_itigris_user_id}` : ''}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'custom':
        return (
          <>
            {Object.keys(mapping.values).map(key => (
              <div key={key} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 px-3 py-1 items-center">
                <span className="text-xs font-mono">{key}</span>
                <span className="w-28" />
                <Input
                  value={mapping.values[key] || ''}
                  onChange={e => updateValue(idx, key, e.target.value)}
                  placeholder="—"
                  className="text-xs h-7"
                />
                <Button size="sm" variant="ghost" onClick={() => removeEntityFromMapping(idx, key)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <div className="px-3 py-2 flex gap-2 items-center">
              <Input
                value={customKeyInput[idx] || ''}
                onChange={e => setCustomKeyInput(prev => ({ ...prev, [idx]: e.target.value }))}
                placeholder="Ключ (название)"
                className="text-xs h-7 flex-1"
                onKeyDown={e => { if (e.key === 'Enter') addCustomKey(idx); }}
              />
              <Button size="sm" variant="outline" onClick={() => addCustomKey(idx)} disabled={!customKeyInput[idx]?.trim()} className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Добавить
              </Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getHint = (entityType: FieldMappingEntityType) => {
    switch (entityType) {
      case 'branch': return 'Пустое значение = метрика не показывается для этого филиала';
      case 'department': return 'Пустое значение = метрика не показывается для этого отдела';
      case 'designation': return 'Пустое значение = метрика не показывается для этой должности';
      case 'employee': return 'Значение — ID сотрудника во внешней системе';
      case 'custom': return 'Статические параметры, применяемые ко всем запросам';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Data Mapping
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Сопоставление внутренних сущностей с полями внешнего API
          </p>
        </div>
        {!addingNew && (
          <Button size="sm" variant="outline" onClick={() => setAddingNew(true)} className="text-xs h-7">
            <Plus className="w-3 h-3 mr-1" /> Добавить поле
          </Button>
        )}
      </div>

      {/* Add new mapping form */}
      {addingNew && (
        <div className="border rounded p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Поле API</label>
              <Input value={newApiField} onChange={e => setNewApiField(e.target.value)} placeholder="filter[pipeline_id]" className="text-xs h-7" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Тип сущности</label>
              <Select value={newEntityType} onValueChange={(v: FieldMappingEntityType) => setNewEntityType(v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">Филиал</SelectItem>
                  <SelectItem value="employee">Сотрудник</SelectItem>
                  <SelectItem value="department">Отдел</SelectItem>
                  <SelectItem value="designation">Должность</SelectItem>
                  <SelectItem value="custom">Произвольное</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Название</label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Pipeline ID" className="text-xs h-7" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addMapping} disabled={!newApiField.trim()} className="text-xs h-6">
              <Plus className="w-3 h-3 mr-1" /> Добавить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewApiField(''); setNewLabel(''); }} className="text-xs h-6">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Existing mappings */}
      {fieldMappings.map((mapping, idx) => (
        <div key={mapping.id || idx} className="border rounded">
          {/* Mapping header */}
          <div className="px-3 py-2 bg-muted/30 border-b flex items-center gap-2">
            {entityTypeIcon(mapping.entityType)}
            <span className="text-xs font-medium flex-1">{mapping.label}</span>
            <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {mapping.apiField}
            </code>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {ENTITY_TYPE_LABELS[mapping.entityType] || mapping.entityType}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => removeMapping(idx)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Values table */}
          <div className="divide-y">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
              <span>{ENTITY_TYPE_LABELS[mapping.entityType] || 'Сущность'}</span>
              <span className="w-28 text-center">Наш ID</span>
              <span>Значение в API</span>
            </div>
            {renderRows(mapping, idx)}
          </div>

          {/* Hint */}
          <div className="px-3 py-1.5 bg-muted/20 border-t">
            <p className="text-[10px] text-muted-foreground italic">{getHint(mapping.entityType)}</p>
          </div>
        </div>
      ))}

      {fieldMappings.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground italic text-center py-3">
          Нет настроенных маппингов. Нажмите "Добавить поле" для создания сопоставления.
        </p>
      )}
    </div>
  );
}

// ─── Single card ───

function DataSourceCard({
  source,
  authTypes,
  paginationTypes,
  testingId,
  testResult,
  onSave,
  onDelete,
  onTest,
}: {
  source: DataSourceConfig;
  authTypes: Record<string, DataSourceAuthTypeDef>;
  paginationTypes: Record<string, DataSourcePaginationTypeDef>;
  testingId: string | null;
  testResult?: { ok: boolean; message: string; latency?: number };
  onSave: (id: string, data: Partial<DataSourceConfig>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="border rounded-lg">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setEditOpen(true)}
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{source.label}</span>
        {source.builtIn && <Badge variant="outline" className="text-[10px] px-1.5 py-0">built-in</Badge>}
        {source.source === 'env' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">env</Badge>}
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{authTypes[source.authType]?.label || source.authType}</Badge>
        <Switch
          checked={source.enabled}
          onCheckedChange={v => {
            onSave(source.id, { enabled: v });
          }}
          onClick={e => e.stopPropagation()}
          className="scale-75"
        />
      </div>

      {/* Subtitle */}
      <div className="px-4 -mt-1 pb-2 text-xs flex items-center gap-3">
        <span className="truncate font-mono text-foreground/70">{source.baseUrl || 'No URL configured'}</span>
        {source.lastTestAt && (
          <span className={source.lastTestStatus === 'OK' ? 'text-green-600' : 'text-red-500'}>
            {source.lastTestStatus}
          </span>
        )}
      </div>

      {/* Edit Dialog */}
      <DataSourceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        source={source}
        authTypes={authTypes}
        paginationTypes={paginationTypes}
        testingId={testingId}
        testResult={testResult}
        onSave={onSave}
        onDelete={onDelete}
        onTest={onTest}
      />
    </div>
  );
}

// ─── New source form ───

function NewDataSourceForm({
  authTypes,
  onCancel,
  onCreate,
}: {
  authTypes: Record<string, DataSourceAuthTypeDef>;
  onCancel: () => void;
  onCreate: (data: Partial<DataSourceConfig>) => Promise<void>;
}) {
  const [form, setForm] = useState<DataSourceFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof DataSourceFormData>(key: K, value: DataSourceFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const authDef = authTypes[form.authType];

  const handleCreate = async () => {
    if (!form.id || !form.label) {
      setError('ID and Label are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate(form);
      onCancel();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 border-primary/30 bg-primary/5">
      <h4 className="text-sm font-medium">New Data Source</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">ID</label>
          <Input
            value={form.id}
            onChange={e => updateField('id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="my_crm"
            className="text-xs h-8"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
          <Input value={form.label} onChange={e => updateField('label', e.target.value)} placeholder="My CRM" className="text-xs h-8" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Base URL</label>
        <Input value={form.baseUrl} onChange={e => updateField('baseUrl', e.target.value)} placeholder="https://api.example.com" className="text-xs h-8" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Authentication</label>
        <Select value={form.authType} onValueChange={(v: DataSourceAuthType) => updateField('authType', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(authTypes).map(([key, def]) => (
              <SelectItem key={key} value={key}>{def.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {authDef && (
          <div className="mt-2">
            <DynamicFields
              fields={authDef.fields}
              values={form.authConfig}
              onChange={v => updateField('authConfig', v)}
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleCreate} disabled={saving} className="text-xs h-7">
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          Create
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───

export function AdminDataSources() {
  const {
    sources,
    authTypes,
    paginationTypes,
    isLoading,
    createSource,
    updateSource,
    deleteSource,
    testConnection,
    testingId,
    testResults,
  } = useAdminDataSources();

  const [showNew, setShowNew] = useState(false);

  const handleSave = useCallback(async (id: string, data: Partial<DataSourceConfig>) => {
    await updateSource({ id, data });
  }, [updateSource]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Delete data source "${id}"?`)) return;
    await deleteSource(id);
  }, [deleteSource]);

  const handleTest = useCallback(async (id: string) => {
    await testConnection(id);
  }, [testConnection]);

  const handleCreate = useCallback(async (data: Partial<DataSourceConfig>) => {
    await createSource(data);
  }, [createSource]);

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner /></div>;
  }

  return (
    <div className="space-y-3 pt-3">
      {sources.map(source => (
        <DataSourceCard
          key={source.id}
          source={source}
          authTypes={authTypes}
          paginationTypes={paginationTypes}
          testingId={testingId}
          testResult={testResults[source.id]}
          onSave={handleSave}
          onDelete={handleDelete}
          onTest={handleTest}
        />
      ))}

      {showNew ? (
        <NewDataSourceForm
          authTypes={authTypes}
          onCancel={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)} className="text-xs h-8 w-full">
          <Plus className="w-3 h-3 mr-1" /> Add Data Source
        </Button>
      )}
    </div>
  );
}
