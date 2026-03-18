import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, GripVertical, X } from 'lucide-react';
import type { DashboardWidget, RankingWidgetConfig, RankingLossConfig } from '@/lib/internalApiClient';
import { RANKING_METRIC_CONFIG, METRIC_NAMES } from '@/hooks/useLeaderMetrics';
import { cn } from '@/lib/utils';

// ── Formula token model (reuse types from FormulaEditor) ──
import { type FormulaToken, type MetricAccessor, tokensToFormula, formulaToTokens } from './FormulaEditor';

const ACCESSOR_LABELS: Record<string, string> = {
  fact: 'Ф',
  plan: 'П',
};

type DialogMode = 'create' | 'edit';

interface RankingWidgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass widget for edit mode, null for create mode */
  widget: DashboardWidget | null;
  onSave: (id: string, data: Partial<DashboardWidget>) => Promise<void>;
  onCreate?: (data: Partial<DashboardWidget>) => Promise<void>;
  isSaving?: boolean;
  availableMetrics?: Array<{ id: string; name: string; trackerCode?: string }>;
  /** Parent metrics for page assignment */
  parentMetrics?: Array<{ id: string; name: string }>;
}

const DEFAULT_LOSS_CONFIG: RankingLossConfig = { mode: 'metric', metricCode: 'revenue_created', formula: '' };

const DEFAULT_BRANCH_CODES = RANKING_METRIC_CONFIG
  .filter(c => c.availableIn.includes('branch'))
  .map(c => c.code);

const DEFAULT_MANAGER_CODES = RANKING_METRIC_CONFIG
  .filter(c => c.availableIn.includes('manager'))
  .map(c => c.code);

const FORECAST_LABEL_MAP: Record<string, string> = {
  forecast: 'Прогноз',
  deviation: 'Отклонение',
};

const LOSS_MODE_LABELS: Record<string, string> = {
  auto: 'Авто (факт − план)',
  metric: 'Одна метрика',
  formula: 'Формула',
  disabled: 'Отключено',
};

export default function RankingWidgetEditDialog({
  open,
  onOpenChange,
  widget,
  onSave,
  onCreate,
  isSaving,
  availableMetrics = [],
  parentMetrics = [],
}: RankingWidgetEditDialogProps) {
  const mode: DialogMode = widget ? 'edit' : 'create';
  const config = (widget?.config || {}) as RankingWidgetConfig;

  const [name, setName] = useState(widget?.name || '');
  const [entityType, setEntityType] = useState<'branch' | 'manager'>(config.entityType || 'branch');
  const [metricCodes, setMetricCodes] = useState<string[]>(config.metricCodes || DEFAULT_BRANCH_CODES);
  const [lossConfig, setLossConfig] = useState<RankingLossConfig>(config.lossConfig || DEFAULT_LOSS_CONFIG);
  const [forecastLabelOverrides, setForecastLabelOverrides] = useState<Record<string, 'forecast' | 'deviation'>>(
    config.forecastLabelOverrides || {},
  );
  const [parentId, setParentId] = useState<string | null>(widget?.parentId || null);

  // Formula visual constructor tokens
  const [formulaTokens, setFormulaTokens] = useState<FormulaToken[]>(() =>
    formulaToTokens(config.lossConfig?.formula || ''),
  );
  const [formulaCursor, setFormulaCursor] = useState<number | null>(null);
  const [formulaDragIdx, setFormulaDragIdx] = useState<number | null>(null);
  const [formulaDropIdx, setFormulaDropIdx] = useState<number | null>(null);
  const formulaContainerRef = useRef<HTMLDivElement>(null);

  // Sync tokens → lossConfig.formula
  useEffect(() => {
    const formula = tokensToFormula(formulaTokens);
    setLossConfig(prev => prev.formula === formula ? prev : { ...prev, formula });
  }, [formulaTokens]);

  // Reset tokens when widget changes (dialog reopened for different widget)
  useEffect(() => {
    const cfg = (widget?.config || {}) as RankingWidgetConfig;
    setFormulaTokens(formulaToTokens(cfg.lossConfig?.formula || ''));
    setFormulaCursor(null);
  }, [widget?.id]);

  // Insert token at cursor or end
  const insertFormulaToken = useCallback((token: FormulaToken) => {
    setFormulaTokens(prev => {
      const pos = formulaCursor !== null ? formulaCursor : prev.length;
      const next = [...prev];
      next.splice(pos, 0, token);
      return next;
    });
    setFormulaCursor(prev => prev !== null ? prev + 1 : null);
  }, [formulaCursor]);

  const [formulaAccessor, setFormulaAccessor] = useState<MetricAccessor>('fact');

  const addFormulaMetric = useCallback((code: string) => {
    insertFormulaToken({ type: 'metric', code, accessor: formulaAccessor });
  }, [insertFormulaToken, formulaAccessor]);

  const addFormulaOperator = useCallback((op: string) => {
    insertFormulaToken({ type: 'operator', value: op });
  }, [insertFormulaToken]);

  const addFormulaParen = useCallback((p: '(' | ')') => {
    insertFormulaToken({ type: 'paren', value: p });
  }, [insertFormulaToken]);

  const removeFormulaToken = useCallback((idx: number) => {
    setFormulaTokens(prev => prev.filter((_, i) => i !== idx));
    setFormulaCursor(prev => {
      if (prev === null) return null;
      if (idx < prev) return prev - 1;
      return prev;
    });
  }, []);

  // Drag handlers for formula tokens
  const handleFormulaDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setFormulaDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleFormulaDragEnd = useCallback(() => {
    setFormulaDragIdx(null);
    setFormulaDropIdx(null);
  }, []);

  const handleFormulaGapDragOver = useCallback((e: React.DragEvent, gapIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setFormulaDropIdx(gapIdx);
  }, []);

  const handleFormulaGapDrop = useCallback((e: React.DragEvent, gapIdx: number) => {
    e.preventDefault();
    const fromIdx = formulaDragIdx;
    setFormulaDragIdx(null);
    setFormulaDropIdx(null);
    if (fromIdx === null) return;
    setFormulaTokens(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      const insertAt = fromIdx < gapIdx ? gapIdx - 1 : gapIdx;
      next.splice(insertAt, 0, moved);
      return next;
    });
    setFormulaCursor(null);
  }, [formulaDragIdx]);

  const currentId = widget?.id ?? '__create__';

  // Build metric options: known + catalog extras
  // Catalog metrics have priority over hardcoded RANKING_METRIC_CONFIG
  const allMetricOptions = useMemo(() => {
    const catalogCodes = new Set<string>();

    // Source 1: catalog metrics (priority — user-created)
    const fromCatalog = availableMetrics.map(m => {
      const code = m.trackerCode || m.id;
      catalogCodes.add(code);
      const known = RANKING_METRIC_CONFIG.find(c => c.code === code);
      return {
        code,
        label: m.name,
        forecastLabel: (known?.forecastLabel || 'forecast') as 'forecast' | 'deviation',
        availableIn: known?.availableIn || ['branch', 'manager'] as ('branch' | 'manager')[],
      };
    });

    // Source 2: known metrics NOT in catalog (fallback hardcode)
    const fromKnown = RANKING_METRIC_CONFIG
      .filter(c => !catalogCodes.has(c.code))
      .map(c => ({
        code: c.code,
        label: METRIC_NAMES[c.code] || c.label,
        forecastLabel: c.forecastLabel,
        availableIn: c.availableIn,
      }));

    return [...fromKnown, ...fromCatalog];
  }, [availableMetrics]);

  // Filter metrics by entity type
  const filteredMetrics = useMemo(
    () => allMetricOptions.filter(m => m.availableIn.includes(entityType)),
    [allMetricOptions, entityType],
  );

  const handleEntityTypeChange = (v: 'branch' | 'manager') => {
    setEntityType(v);
    // Reset metric codes to defaults for the new entity type
    const defaults = v === 'branch' ? DEFAULT_BRANCH_CODES : DEFAULT_MANAGER_CODES;
    setMetricCodes(defaults);
  };

  const handleToggleMetric = (code: string) => {
    if (metricCodes.includes(code)) {
      if (metricCodes.length <= 1) return;
      setMetricCodes(metricCodes.filter(c => c !== code));
    } else {
      setMetricCodes([...metricCodes, code]);
    }
  };

  const handleToggleAll = () => {
    const allCodes = filteredMetrics.map(m => m.code);
    if (metricCodes.length === allCodes.length) {
      // Keep at least first one
      setMetricCodes([allCodes[0]]);
    } else {
      setMetricCodes(allCodes);
    }
  };

  const handleSave = async () => {
    console.log('[RankingWidget] handleSave called, parentId state =', parentId);
    const data: Partial<DashboardWidget> = {
      name: name.trim() || (entityType === 'branch' ? 'Рейтинг филиалов' : 'Рейтинг менеджеров'),
      parentId: parentId || null,
      config: {
        entityType,
        metricCodes,
        lossConfig,
        ...(Object.keys(forecastLabelOverrides).length > 0 ? { forecastLabelOverrides } : {}),
      },
    };
    console.log('[RankingWidget] saving data:', JSON.stringify(data));

    if (mode === 'edit' && widget) {
      await onSave(widget.id, data);
    } else if (mode === 'create' && onCreate) {
      await onCreate({ ...data, type: 'ranking', enabled: true });
    }
    onOpenChange(false);
  };

  const allSelected = metricCodes.length === filteredMetrics.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === 'create' ? 'Новый рейтинг' : 'Настройки рейтинга'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Название</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={entityType === 'branch' ? 'Рейтинг филиалов' : 'Рейтинг менеджеров'}
              className="text-sm h-9"
            />
          </div>

          {/* Parent page */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Страница</label>
            <select
              value={parentId || '__main__'}
              onChange={e => {
                const val = e.target.value === '__main__' ? null : e.target.value;
                console.log('[RankingWidget] parentId onChange:', { raw: e.target.value, resolved: val, options: parentMetrics.map(m => m.id) });
                setParentId(val);
              }}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="__main__">Главная (дашборд)</option>
              {parentMetrics.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              На какой странице будет отображаться рейтинг
            </p>
          </div>

          {/* Entity Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Тип рейтинга</label>
            <RadioGroup
              value={entityType}
              onValueChange={(v) => handleEntityTypeChange(v as 'branch' | 'manager')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="branch" id={`entity-branch-${currentId}`} />
                <label htmlFor={`entity-branch-${currentId}`} className="text-sm cursor-pointer">Филиалы</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manager" id={`entity-manager-${currentId}`} />
                <label htmlFor={`entity-manager-${currentId}`} className="text-sm cursor-pointer">Сотрудники</label>
              </div>
            </RadioGroup>
          </div>

          {/* Metrics table */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Колонки рейтинга</label>
            <div className="border rounded-lg overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[28px_1fr_90px] items-center gap-0 px-2 py-1.5 bg-muted/50 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="flex justify-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleToggleAll}
                    className="h-3.5 w-3.5"
                  />
                </div>
                <div>Метрика</div>
                <div className="text-right pr-1">Тип</div>
              </div>
              {/* Table rows */}
              <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                {filteredMetrics.map(opt => {
                  const checked = metricCodes.includes(opt.code);
                  const disabled = checked && metricCodes.length <= 1;
                  return (
                    <label
                      key={opt.code}
                      className={cn(
                        'grid grid-cols-[28px_1fr_90px] items-center gap-0 px-2 py-2 cursor-pointer select-none hover:bg-muted/40 transition-colors',
                        disabled && 'opacity-50 cursor-not-allowed',
                        checked && 'bg-primary/[0.03]',
                      )}
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => handleToggleMetric(opt.code)}
                          disabled={disabled}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                      <span className="text-xs font-medium truncate">{opt.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const current = forecastLabelOverrides[opt.code] || opt.forecastLabel;
                          const next = current === 'forecast' ? 'deviation' : 'forecast';
                          setForecastLabelOverrides(prev => ({ ...prev, [opt.code]: next }));
                        }}
                        className={cn(
                          'text-[10px] text-right pr-1 font-medium cursor-pointer hover:underline',
                          (forecastLabelOverrides[opt.code] || opt.forecastLabel) === 'forecast'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {FORECAST_LABEL_MAP[forecastLabelOverrides[opt.code] || opt.forecastLabel] || opt.forecastLabel}
                      </button>
                    </label>
                  );
                })}
              </div>
              {/* Footer summary */}
              <div className="px-3 py-1.5 border-t bg-muted/30 text-[10px] text-muted-foreground">
                Выбрано {metricCodes.length} из {filteredMetrics.length}
              </div>
            </div>
          </div>

          {/* Loss config */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Потери / Запас</label>
            <Select
              value={lossConfig.mode}
              onValueChange={(v: RankingLossConfig['mode']) => {
                setLossConfig(prev => ({ ...prev, mode: v }));
                // Pre-populate formula tokens from metricCode when switching to formula
                if (v === 'formula' && formulaTokens.length === 0 && lossConfig.metricCode) {
                  setFormulaTokens([{ type: 'metric', code: lossConfig.metricCode }]);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Авто (факт − план)</SelectItem>
                <SelectItem value="metric">Одна метрика</SelectItem>
                <SelectItem value="formula">Формула</SelectItem>
                <SelectItem value="disabled">Отключено</SelectItem>
              </SelectContent>
            </Select>

            {lossConfig.mode === 'auto' && (
              <Select
                value={lossConfig.metricCode}
                onValueChange={v => setLossConfig(prev => ({ ...prev, metricCode: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выберите метрику" />
                </SelectTrigger>
                <SelectContent>
                  {allMetricOptions.map(opt => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {lossConfig.mode === 'metric' && (
              <Select
                value={lossConfig.metricCode}
                onValueChange={v => setLossConfig(prev => ({ ...prev, metricCode: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выберите метрику" />
                </SelectTrigger>
                <SelectContent>
                  {allMetricOptions.map(opt => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {lossConfig.mode === 'formula' && (
              <div className="space-y-2">
                {/* Token chips area with gaps for cursor/drop */}
                <div
                  ref={formulaContainerRef}
                  className="min-h-[40px] flex flex-wrap items-center p-2 rounded-md border bg-background max-h-[120px] overflow-y-auto cursor-text"
                  onClick={(e) => { if (e.target === formulaContainerRef.current) setFormulaCursor(formulaTokens.length); }}
                >
                  {formulaTokens.length === 0 && (
                    <span className="text-xs text-muted-foreground">Добавьте метрики и операторы...</span>
                  )}
                  {formulaTokens.map((token, idx) => {
                    const isDragging = formulaDragIdx === idx;
                    const isDropTarget = formulaDragIdx !== null && formulaDropIdx === idx;
                    const isCursorHere = formulaCursor === idx;
                    const dragProps = {
                      draggable: true,
                      onDragStart: (e: React.DragEvent) => handleFormulaDragStart(e, idx),
                      onDragEnd: handleFormulaDragEnd,
                    };
                    return (
                      <React.Fragment key={idx}>
                        {/* Gap before token */}
                        <div
                          className={cn(
                            'self-stretch flex items-center justify-center transition-all duration-150',
                            formulaDragIdx !== null ? 'w-2 min-w-[8px]' : 'w-1 min-w-[4px]',
                            isDropTarget && 'w-3 min-w-[12px]',
                          )}
                          onClick={() => setFormulaCursor(idx)}
                          onDragOver={(e) => handleFormulaGapDragOver(e, idx)}
                          onDrop={(e) => handleFormulaGapDrop(e, idx)}
                        >
                          <div className={cn(
                            'w-0.5 h-5 rounded-full transition-all duration-150',
                            isCursorHere && 'bg-primary animate-pulse w-0.5',
                            isDropTarget && 'bg-blue-500 w-1 h-6',
                            !isCursorHere && !isDropTarget && 'bg-transparent hover:bg-muted-foreground/30',
                          )} />
                        </div>
                        {/* Token */}
                        {token.type === 'metric' ? (() => {
                          const accessorLabel = token.accessor ? ACCESSOR_LABELS[token.accessor] : null;
                          return (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'gap-0.5 pr-1 text-xs font-normal cursor-grab active:cursor-grabbing select-none',
                              isDragging && 'opacity-40',
                            )}
                            {...dragProps}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            {allMetricOptions.find(m => m.code === token.code)?.label || token.code}
                            {accessorLabel && (
                              <span className={cn(
                                'ml-0.5 text-[9px] font-semibold px-1 py-0 rounded',
                                token.accessor === 'fact' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                              )}>
                                {accessorLabel}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeFormulaToken(idx); }}
                              className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                          );
                        })() : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 text-xs font-mono bg-muted rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none',
                              isDragging && 'opacity-40',
                            )}
                            {...dragProps}
                          >
                            <GripVertical className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
                            {token.value}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeFormulaToken(idx); }}
                              className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {/* Gap after last token */}
                  {formulaTokens.length > 0 && (() => {
                    const gapIdx = formulaTokens.length;
                    const isDropTarget = formulaDragIdx !== null && formulaDropIdx === gapIdx;
                    const isCursorHere = formulaCursor === gapIdx;
                    return (
                      <div
                        className={cn(
                          'self-stretch flex items-center justify-center transition-all duration-150',
                          formulaDragIdx !== null ? 'w-2 min-w-[8px]' : 'w-1 min-w-[4px]',
                          isDropTarget && 'w-3 min-w-[12px]',
                        )}
                        onClick={() => setFormulaCursor(gapIdx)}
                        onDragOver={(e) => handleFormulaGapDragOver(e, gapIdx)}
                        onDrop={(e) => handleFormulaGapDrop(e, gapIdx)}
                      >
                        <div className={cn(
                          'w-0.5 h-5 rounded-full transition-all duration-150',
                          isCursorHere && 'bg-primary animate-pulse w-0.5',
                          isDropTarget && 'bg-blue-500 w-1 h-6',
                          !isCursorHere && !isDropTarget && 'bg-transparent hover:bg-muted-foreground/30',
                        )} />
                      </div>
                    );
                  })()}
                </div>

                {/* Controls: metric selector + operator buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Select
                    value=""
                    onValueChange={v => { if (v) addFormulaMetric(v); }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                      <SelectValue placeholder="+ Метрика" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMetricOptions.map(opt => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Accessor toggle: fact / plan */}
                  <div className="flex items-center h-7 rounded-md border bg-muted/30 text-[10px]">
                    {(['fact', 'plan'] as const).map(acc => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => setFormulaAccessor(acc as MetricAccessor)}
                        className={cn(
                          'px-1.5 h-full rounded-md transition-colors',
                          formulaAccessor === acc
                            ? 'bg-background shadow-sm font-medium text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {acc === 'fact' ? 'Факт' : 'План'}
                      </button>
                    ))}
                  </div>

                  {['+', '-', '*', '/'].map(op => (
                    <Button
                      key={op}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 font-mono text-xs"
                      onClick={() => addFormulaOperator(op)}
                    >
                      {op}
                    </Button>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0 font-mono text-xs" onClick={() => addFormulaParen('(')}>
                    (
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0 font-mono text-xs" onClick={() => addFormulaParen(')')}>
                    )
                  </Button>

                  {formulaTokens.length > 0 && (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                      onClick={() => { setFormulaTokens([]); setFormulaCursor(null); }}
                    >
                      Очистить
                    </button>
                  )}
                </div>

                {/* Raw formula preview */}
                {formulaTokens.length > 0 && (
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {tokensToFormula(formulaTokens)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Отмена
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="text-xs">
            {isSaving
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : mode === 'create'
                ? <Plus className="w-3.5 h-3.5 mr-1.5" />
                : <Save className="w-3.5 h-3.5 mr-1.5" />
            }
            {mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
