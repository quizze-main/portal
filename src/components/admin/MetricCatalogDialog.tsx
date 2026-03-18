import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/Spinner';
import {
  Users,
  Contact,
  Building,
  ListTodo,
  BarChart3,
  Database,
  Plus,
  Check,
} from 'lucide-react';
import { internalApiClient } from '@/lib/internalApiClient';
import type { MetricCatalogCategory, MetricTemplate } from '@/lib/internalApiClient';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-4 h-4" />,
  contact: <Contact className="w-4 h-4" />,
  building: <Building className="w-4 h-4" />,
  'list-todo': <ListTodo className="w-4 h-4" />,
  'bar-chart': <BarChart3 className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
};

interface MetricCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSources: Array<{ id: string; label: string; enabled: boolean }>;
  existingMetricIds: Set<string>;
  onTemplateSelected: (template: MetricTemplate) => void;
}

const MetricCatalogDialog: React.FC<MetricCatalogDialogProps> = ({
  open,
  onOpenChange,
  dataSources,
  existingMetricIds,
  onTemplateSelected,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [categories, setCategories] = useState<MetricCatalogCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSourceId('');
      setCategories([]);
      setError(null);
      setIsDiscovering(false);
    }
  }, [open]);

  const enabledSources = dataSources.filter(s => s.enabled);

  const handleSourceChange = useCallback(async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setCategories([]);
    setError(null);

    if (!sourceId) return;

    setIsDiscovering(true);
    try {
      const result = await internalApiClient.discoverDataSourceMetrics(sourceId);
      setCategories(result.categories || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const handleAdd = useCallback((template: MetricTemplate) => {
    onTemplateSelected(template);
    onOpenChange(false);
  }, [onTemplateSelected, onOpenChange]);

  const totalTemplates = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Каталог метрик</DialogTitle>
          <DialogDescription className="text-xs">
            Выберите источник данных, чтобы увидеть доступные метрики
          </DialogDescription>
        </DialogHeader>

        {/* Source selector */}
        <div>
          <Select value={selectedSourceId} onValueChange={handleSourceChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Выберите источник данных..." />
            </SelectTrigger>
            <SelectContent>
              {enabledSources.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {isDiscovering && (
          <div className="flex items-center justify-center py-8">
            <Spinner />
            <span className="ml-2 text-xs text-muted-foreground">Поиск доступных метрик...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-500 py-4 text-center">{error}</div>
        )}

        {/* Categories grid */}
        {!isDiscovering && categories.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="text-xs text-muted-foreground">
              Найдено {totalTemplates} метрик{totalTemplates > 4 ? '' : totalTemplates > 1 ? 'и' : 'а'}
            </div>
            {categories.map(category => (
              <div key={category.name}>
                <div className="flex items-center gap-2 mb-2">
                  {CATEGORY_ICONS[category.icon] || <Database className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{category.name}</span>
                  <span className="text-[10px] text-muted-foreground">({category.items.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {category.items.map(item => {
                    const alreadyAdded = existingMetricIds.has(item.templateId) ||
                      item.alreadyExists;

                    return (
                      <div key={item.templateId} className="border rounded-lg p-3 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground leading-snug">{item.description}</div>
                          </div>
                          {item.previewValue != null && (
                            <span className="text-xs font-mono text-primary shrink-0">{item.previewValue}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground truncate">
                            {item.config.externalPath || item.config.trackerCode || ''}
                          </span>
                          <Button
                            size="sm"
                            variant={alreadyAdded ? 'ghost' : 'default'}
                            disabled={!!alreadyAdded}
                            onClick={() => handleAdd(item)}
                            className="text-xs h-6 px-2 shrink-0"
                          >
                            {alreadyAdded ? (
                              <><Check className="w-3 h-3 mr-0.5" /> Добавлено</>
                            ) : (
                              <><Plus className="w-3 h-3 mr-0.5" /> Настроить</>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isDiscovering && !error && selectedSourceId && categories.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Для этого источника шаблоны не найдены. Используйте API Explorer для ручной настройки.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MetricCatalogDialog;
