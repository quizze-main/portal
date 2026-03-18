import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Shield,
  Layers,
  HeartPulse,
  Link2,
  Trash2,
  Save,
  X,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import type {
  DataSourceConfig,
  DataSourceAuthType,
  DataSourcePaginationType,
  DataSourceAuthTypeDef,
  DataSourcePaginationTypeDef,
} from '@/lib/internalApiClient';
import {
  DynamicFields,
  DataSourceFieldMappings,
  dsToForm,
  type DataSourceFormData,
} from './AdminDataSources';
import ApiExplorerPanel from './ApiExplorerPanel';

// ─── Props ───

interface DataSourceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: DataSourceConfig;
  authTypes: Record<string, DataSourceAuthTypeDef>;
  paginationTypes: Record<string, DataSourcePaginationTypeDef>;
  testingId: string | null;
  testResult?: { ok: boolean; message: string; latency?: number };
  onSave: (id: string, data: Partial<DataSourceConfig>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
  initialTab?: string;
}

// ─── Tab definitions ───

const TABS = [
  { id: 'connection', label: 'Подключение', icon: Globe },
  { id: 'auth', label: 'Авторизация', icon: Shield },
  { id: 'pagination', label: 'Пагинация', icon: Layers },
  { id: 'health', label: 'Health & Маппинг', icon: HeartPulse },
] as const;

// ─── Component ───

export const DataSourceEditDialog: React.FC<DataSourceEditDialogProps> = ({
  open,
  onOpenChange,
  source,
  authTypes,
  paginationTypes,
  testingId,
  testResult,
  onSave,
  onDelete,
  onTest,
  initialTab = 'connection',
}) => {
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState<DataSourceFormData>(() => dsToForm(source));
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);

  const isTesting = testingId === source.id;
  const hasChanges = useMemo(
    () => JSON.stringify(dsToForm(source)) !== JSON.stringify(form),
    [source, form]
  );

  // Reset form when source changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setForm(dsToForm(source));
      setTab(initialTab);
    }
  }, [source, open, initialTab]);

  const updateField = <K extends keyof DataSourceFormData>(key: K, value: DataSourceFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(source.id, form);
    } finally {
      setSaving(false);
    }
  }, [onSave, source.id, form]);

  const handleCancel = useCallback(() => {
    setForm(dsToForm(source));
  }, [source]);

  const handleDelete = useCallback(async () => {
    await onDelete(source.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }, [onDelete, source.id, onOpenChange]);

  const authDef = authTypes[form.authType];
  const paginationDef = paginationTypes[form.paginationType];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-sm">{source.label}</DialogTitle>
              {source.builtIn && <Badge variant="outline" className="text-[10px] px-1.5 py-0">built-in</Badge>}
              {source.source === 'env' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">env</Badge>}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {authTypes[source.authType]?.label || source.authType}
              </Badge>
            </div>
            <DialogDescription className="text-xs font-mono truncate">
              {source.baseUrl || 'No URL configured'}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-9 px-5 shrink-0">
              {TABS.map(t => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3"
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Connection */}
              <TabsContent value="connection" className="mt-0 space-y-3">
                <p className="text-[10px] text-muted-foreground">
                  Базовый URL и таймаут для всех запросов к этому API
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
                  <Input value={form.label} onChange={e => updateField('label', e.target.value)} className="text-xs h-8" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Base URL</label>
                  <Input value={form.baseUrl} onChange={e => updateField('baseUrl', e.target.value)} placeholder="https://api.example.com" className="text-xs h-8" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Timeout (ms)</label>
                    <Input type="number" value={form.timeout} onChange={e => updateField('timeout', parseInt(e.target.value) || 10000)} className="text-xs h-8" />
                  </div>
                </div>
              </TabsContent>

              {/* Authentication */}
              <TabsContent value="auth" className="mt-0 space-y-3">
                <p className="text-[10px] text-muted-foreground">
                  Данные авторизации, отправляемые с каждым запросом
                </p>
                <Select value={form.authType} onValueChange={(v: DataSourceAuthType) => updateField('authType', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(authTypes).map(([key, def]) => (
                      <SelectItem key={key} value={key}>{def.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {authDef && (
                  <DynamicFields
                    fields={authDef.fields}
                    values={form.authConfig}
                    onChange={v => updateField('authConfig', v)}
                  />
                )}
              </TabsContent>

              {/* Pagination */}
              <TabsContent value="pagination" className="mt-0 space-y-3">
                <p className="text-[10px] text-muted-foreground">
                  Настройка постраничной загрузки для списковых эндпоинтов
                </p>
                <Select value={form.paginationType} onValueChange={(v: DataSourcePaginationType) => updateField('paginationType', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(paginationTypes).map(([key, def]) => (
                      <SelectItem key={key} value={key}>{def.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {paginationDef && (
                  <DynamicFields
                    fields={paginationDef.fields}
                    values={form.paginationConfig}
                    onChange={v => updateField('paginationConfig', v)}
                  />
                )}
              </TabsContent>

              {/* Health Check & Mapping */}
              <TabsContent value="health" className="mt-0 space-y-4">
                {/* Health Check section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Health Check</span>
                    <span className="text-[10px] text-muted-foreground">— проверка доступности API</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Path</label>
                      <Input value={form.healthCheckPath} onChange={e => updateField('healthCheckPath', e.target.value)} placeholder="/" className="text-xs h-8" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Method</label>
                      <Select value={form.healthCheckMethod} onValueChange={v => updateField('healthCheckMethod', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="HEAD">HEAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md ${testResult.ok ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                      {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {testResult.message}
                      {testResult.latency != null && ` (${testResult.latency}ms)`}
                    </div>
                  )}

                  {/* Test + Explorer buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => onTest(source.id)} disabled={isTesting} className="text-xs h-7">
                      {isTesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                      Test
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowExplorer(!showExplorer)} className="text-xs h-7">
                      <Eye className="w-3 h-3 mr-1" />
                      {showExplorer ? 'Скрыть Explorer' : 'API Explorer'}
                    </Button>
                  </div>

                  {showExplorer && <ApiExplorerPanel sourceId={source.id} />}
                </div>

                {/* Divider */}
                <div className="border-t" />

                {/* Mapping section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Маппинг полей</span>
                    <span className="text-[10px] text-muted-foreground">— привязка полей API к сущностям</span>
                  </div>
                  <DataSourceFieldMappings
                    fieldMappings={form.fieldMappings}
                    onChange={fms => updateField('fieldMappings', fms)}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t shrink-0">
            <div>
              {!source.builtIn && (
                <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="text-xs h-8 text-red-500 hover:text-red-700">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 text-xs">
                  <X className="w-3.5 h-3.5 mr-1" /> Сбросить
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="h-8 text-xs">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить источник данных?</AlertDialogTitle>
            <AlertDialogDescription>
              Источник «{source.label}» будет удалён. Метрики, использующие этот источник, перестанут получать данные.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
