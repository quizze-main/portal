import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner';
import { CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useAdminKbProviders } from '@/hooks/useAdminKbProviders';
import type { KbProviderConfig } from '@/lib/internalApiClient';

const PROVIDER_ORDER = ['outline', 'notion', 'confluence', 'yandex_wiki'] as const;

export const AdminKbConnector: React.FC = () => {
  const { providers, saveMutation, testConnection, testingType, testResult } = useAdminKbProviders();
  const [selectedType, setSelectedType] = useState<string>('outline');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const data = providers.data?.providers;

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const getFieldValue = (type: string, key: string) => {
    if (formValues[`${type}.${key}`] !== undefined) return formValues[`${type}.${key}`];
    const cfg = data?.[type]?.config;
    return (cfg as any)?.[key] || '';
  };

  const handleSave = async (type: string) => {
    const info = data?.[type];
    if (!info) return;

    const config: Partial<KbProviderConfig> = { is_active: true };
    for (const field of info.fields) {
      const val = getFieldValue(type, field.key);
      if (val) (config as any)[field.key] = val;
    }

    await saveMutation.mutateAsync({ type, config });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTest = async (type: string) => {
    const info = data?.[type];
    if (!info) return;

    const config: Partial<KbProviderConfig> = {};
    for (const field of info.fields) {
      const val = getFieldValue(type, field.key);
      if (val) (config as any)[field.key] = val;
    }

    await testConnection(type, config);
  };

  if (providers.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (providers.isError) {
    return <p className="text-sm text-red-500">Ошибка загрузки провайдеров</p>;
  }

  if (!data) return null;

  const selected = data[selectedType];

  return (
    <div className="space-y-6">
      {/* Provider selector */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
          Провайдер
        </Label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_ORDER.map((type) => {
            const info = data[type];
            if (!info) return null;
            const isActive = type === selectedType;
            return (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setSaveSuccess(false); }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors
                  ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}
                `}
              >
                {info.label}
                {info.comingSoon && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">Soon</Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Config form */}
      {selected && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{selected.label}</h4>
            {selected.config?.source === 'env' && (
              <Badge variant="outline" className="text-[10px]">env</Badge>
            )}
          </div>

          {selected.fields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={`kb-${selectedType}-${field.key}`} className="text-xs">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={`kb-${selectedType}-${field.key}`}
                value={getFieldValue(selectedType, field.key)}
                onChange={(e) => handleFieldChange(`${selectedType}.${field.key}`, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1"
                type={field.key.includes('key') || field.key.includes('secret') ? 'password' : 'text'}
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleSave(selectedType)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTest(selectedType)}
              disabled={testingType === selectedType}
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              {testingType === selectedType ? 'Проверка...' : 'Тест подключения'}
            </Button>
            {saveSuccess && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Сохранено
              </span>
            )}
          </div>

          {/* Test result */}
          {testResult[selectedType] && (
            <div className={`flex items-center gap-2 text-xs mt-2 p-2 rounded ${
              testResult[selectedType].ok
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
            }`}>
              {testResult[selectedType].ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult[selectedType].message}</span>
              {testResult[selectedType].latency != null && (
                <span className="text-muted-foreground ml-auto">{testResult[selectedType].latency}ms</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* All providers status table */}
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Все провайдеры
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 pr-3 font-medium">Провайдер</th>
                <th className="text-left py-2 pr-3 font-medium">Статус</th>
                <th className="text-left py-2 font-medium">Последний тест</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_ORDER.map((type) => {
                const info = data[type];
                if (!info) return null;
                const cfg = info.config;
                const configured = cfg && (cfg.base_url || cfg.api_key);
                return (
                  <tr key={type} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{info.label}</td>
                    <td className="py-2 pr-3">
                      {info.comingSoon ? (
                        <Badge variant="secondary" className="text-[10px]">Coming soon</Badge>
                      ) : configured ? (
                        <Badge variant="default" className="text-[10px] bg-green-600">Настроен</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Не настроен</Badge>
                      )}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {cfg?.last_test_at
                        ? `${cfg.last_test_status} (${new Date(cfg.last_test_at).toLocaleString('ru-RU')})`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
