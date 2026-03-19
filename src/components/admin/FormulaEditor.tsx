import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardMetricConfig } from '@/lib/internalApiClient';

// ── Formula token model ──

export type MetricAccessor = 'fact' | 'plan' | undefined;

export type FormulaToken =
  | { type: 'metric'; code: string; accessor?: MetricAccessor }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'func'; value: string };

const OPERATORS = ['+', '-', '*', '/'] as const;
const FUNCTIONS = ['min', 'max', 'avg', 'round', 'if'] as const;

const ACCESSOR_LABELS: Record<string, string> = {
  fact: 'Ф',
  plan: 'П',
};

export function tokensToFormula(tokens: FormulaToken[]): string {
  return tokens
    .map(t => {
      if (t.type === 'metric') {
        return t.accessor ? `{${t.code}.${t.accessor}}` : `{${t.code}}`;
      }
      if (t.type === 'func') return `${t.value}(`;
      return t.value;
    })
    .join(' ');
}

export function formulaToTokens(formula: string): FormulaToken[] {
  if (!formula || !formula.trim()) return [];
  const tokens: FormulaToken[] = [];
  const re = /\{([^}]+)\}|(min|max|avg|round|if)\s*\(|([+\-*/])|([()])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(formula)) !== null) {
    if (match[1]) {
      const raw = match[1].trim();
      // Parse optional .fact / .plan accessor
      const dotIdx = raw.lastIndexOf('.');
      if (dotIdx > 0 && (raw.endsWith('.fact') || raw.endsWith('.plan'))) {
        tokens.push({ type: 'metric', code: raw.slice(0, dotIdx), accessor: raw.slice(dotIdx + 1) as MetricAccessor });
      } else {
        tokens.push({ type: 'metric', code: raw });
      }
    } else if (match[2]) {
      tokens.push({ type: 'func', value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'operator', value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: 'paren', value: match[4] as '(' | ')' });
    }
  }
  return tokens;
}

// ── Component ──

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  metrics: DashboardMetricConfig[];
  currentMetricId?: string;
}

export const FormulaEditor: React.FC<FormulaEditorProps> = ({
  value,
  onChange,
  metrics,
  currentMetricId,
}) => {
  const [tokens, setTokens] = useState<FormulaToken[]>(() => formulaToTokens(value));
  // Cursor position: index where new tokens will be inserted (null = end)
  const [cursor, setCursor] = useState<number | null>(null);
  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync tokens → parent onChange
  useEffect(() => {
    const formula = tokensToFormula(tokens);
    if (formula !== value) onChange(formula);
  }, [tokens]);

  // Sync incoming value → tokens when value changes externally
  useEffect(() => {
    const current = tokensToFormula(tokens);
    if (value !== current) {
      setTokens(formulaToTokens(value));
      setCursor(null);
    }
  }, [value]);

  const availableMetrics = useMemo(
    () => metrics.filter(m => m.id !== currentMetricId && m.metricType !== 'computed'),
    [metrics, currentMetricId],
  );

  const metricNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    metrics.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [metrics]);

  // Insert token at cursor position or at end
  const insertToken = useCallback((token: FormulaToken) => {
    setTokens(prev => {
      const pos = cursor !== null ? cursor : prev.length;
      const next = [...prev];
      next.splice(pos, 0, token);
      return next;
    });
    setCursor(prev => prev !== null ? prev + 1 : null);
  }, [cursor]);

  // Accessor mode for newly added metrics
  const [metricAccessor, setMetricAccessor] = useState<MetricAccessor>('fact');

  const addMetric = useCallback((code: string) => {
    insertToken({ type: 'metric', code, accessor: metricAccessor });
  }, [insertToken, metricAccessor]);

  const addOperator = useCallback((op: string) => {
    insertToken({ type: 'operator', value: op });
  }, [insertToken]);

  const addParen = useCallback((p: '(' | ')') => {
    insertToken({ type: 'paren', value: p });
  }, [insertToken]);

  const addFunc = useCallback((fn: string) => {
    insertToken({ type: 'func', value: fn });
  }, [insertToken]);

  const removeToken = useCallback((idx: number) => {
    setTokens(prev => prev.filter((_, i) => i !== idx));
    setCursor(prev => {
      if (prev === null) return null;
      if (idx < prev) return prev - 1;
      if (idx === prev) return prev;
      return prev;
    });
  }, []);

  // ── Drag & Drop ──
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIdx;
    setDragIdx(null);
    setDropIdx(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    setTokens(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
      next.splice(insertAt, 0, moved);
      return next;
    });
    setCursor(null);
  }, [dragIdx]);

  // Handle drop on the gap zones (between/before/after tokens)
  const handleGapDragOver = useCallback((e: React.DragEvent, gapIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(gapIdx);
  }, []);

  const handleGapDrop = useCallback((e: React.DragEvent, gapIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIdx;
    setDragIdx(null);
    setDropIdx(null);
    if (fromIdx === null) return;
    setTokens(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      const insertAt = fromIdx < gapIdx ? gapIdx - 1 : gapIdx;
      next.splice(insertAt, 0, moved);
      return next;
    });
    setCursor(null);
  }, [dragIdx]);

  // Click on gap to set cursor there
  const handleGapClick = useCallback((gapIdx: number) => {
    setCursor(gapIdx);
  }, []);

  // Click on container background to set cursor to end
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setCursor(tokens.length);
    }
  }, [tokens.length]);

  // Picker reset key — forces the Select to remount after each pick
  const [pickerKey, setPickerKey] = useState(0);

  // Validate: check for unknown metric references
  const unknownRefs = useMemo(() => {
    const metricIds = new Set(metrics.map(m => m.id));
    return tokens
      .filter(t => t.type === 'metric' && !metricIds.has((t as { code: string }).code))
      .map(t => (t as { type: 'metric'; code: string }).code);
  }, [tokens, metrics]);

  // ── Render a single token chip ──
  const renderToken = (token: FormulaToken, idx: number) => {
    const isDragging = dragIdx === idx;
    const commonDragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, idx),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, idx),
      onDrop: (e: React.DragEvent) => handleDrop(e, idx),
      onDragEnd: handleDragEnd,
    };

    if (token.type === 'metric') {
      const label = metricNameMap[token.code] || token.code;
      const isUnknown = unknownRefs.includes(token.code);
      const accessorLabel = token.accessor ? ACCESSOR_LABELS[token.accessor] : null;
      return (
        <Badge
          key={idx}
          variant="secondary"
          className={cn(
            'gap-0.5 pr-1 text-xs font-normal cursor-grab active:cursor-grabbing select-none',
            isDragging && 'opacity-40',
            isUnknown && 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300',
          )}
          {...commonDragProps}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          {label}
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
            onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
            className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }
    if (token.type === 'func') {
      return (
        <span
          key={idx}
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none',
            isDragging && 'opacity-40',
          )}
          {...commonDragProps}
        >
          <GripVertical className="h-2.5 w-2.5 text-blue-400/50 shrink-0" />
          {token.value}(
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
            className="ml-0.5 rounded-sm hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      );
    }
    // operator or paren
    return (
      <span
        key={idx}
        className={cn(
          'inline-flex items-center gap-0.5 text-xs font-mono bg-muted rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none',
          isDragging && 'opacity-40',
        )}
        {...commonDragProps}
      >
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
        {token.value}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
          className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </span>
    );
  };

  // ── Render a gap (insertion point) between tokens ──
  const renderGap = (gapIdx: number) => {
    const isDropTarget = dragIdx !== null && dropIdx === gapIdx;
    const isCursor = cursor === gapIdx;
    return (
      <div
        key={`gap-${gapIdx}`}
        className={cn(
          'self-stretch flex items-center justify-center transition-all duration-150',
          dragIdx !== null ? 'w-2 min-w-[8px]' : 'w-1 min-w-[4px]',
          isDropTarget && 'w-3 min-w-[12px]',
        )}
        onClick={() => handleGapClick(gapIdx)}
        onDragOver={(e) => handleGapDragOver(e, gapIdx)}
        onDrop={(e) => handleGapDrop(e, gapIdx)}
      >
        <div
          className={cn(
            'w-0.5 h-5 rounded-full transition-all duration-150',
            isCursor && 'bg-primary animate-pulse w-0.5',
            isDropTarget && 'bg-blue-500 w-1 h-6',
            !isCursor && !isDropTarget && 'bg-transparent hover:bg-muted-foreground/30',
          )}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">
        Формула
      </label>

      {/* Token chips area with gaps for cursor/drop */}
      <div
        ref={containerRef}
        className="min-h-[40px] flex flex-wrap items-center p-2 rounded-md border bg-background max-h-[120px] overflow-y-auto cursor-text"
        onClick={handleContainerClick}
      >
        {tokens.length === 0 && (
          <span className="text-xs text-muted-foreground">Добавьте метрики и операторы...</span>
        )}
        {tokens.map((token, idx) => (
          <React.Fragment key={idx}>
            {renderGap(idx)}
            {renderToken(token, idx)}
          </React.Fragment>
        ))}
        {tokens.length > 0 && renderGap(tokens.length)}
      </div>

      {/* Controls row 1: metric selector + accessor toggle + operators */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Select key={pickerKey} onValueChange={v => { if (v) { addMetric(v); setPickerKey(k => k + 1); } }}>
          <SelectTrigger className="h-7 text-xs w-[160px]">
            <SelectValue placeholder="+ Метрика" />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <span className="truncate">{m.name}</span>
                {m.unit && <span className="text-muted-foreground ml-1 text-[10px]">{m.unit}</span>}
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
              onClick={() => setMetricAccessor(acc as MetricAccessor)}
              className={cn(
                'px-1.5 h-full rounded-md transition-colors',
                metricAccessor === acc
                  ? 'bg-background shadow-sm font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {acc === 'fact' ? 'Факт' : 'План'}
            </button>
          ))}
        </div>

        {OPERATORS.map(op => (
          <Button
            key={op}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 font-mono text-xs"
            onClick={() => addOperator(op)}
          >
            {op}
          </Button>
        ))}

        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0 font-mono text-xs" onClick={() => addParen('(')}>
          (
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0 font-mono text-xs" onClick={() => addParen(')')}>
          )
        </Button>

        {tokens.length > 0 && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
            onClick={() => { setTokens([]); setCursor(null); }}
          >
            Очистить
          </button>
        )}
      </div>

      {/* Controls row 2: functions */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Функции:</span>
        {FUNCTIONS.map(fn => (
          <Button
            key={fn}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 font-mono text-[10px]"
            onClick={() => addFunc(fn)}
          >
            {fn}()
          </Button>
        ))}
      </div>

      {/* Unknown refs warning */}
      {unknownRefs.length > 0 && (
        <p className="text-[10px] text-red-500">
          Неизвестные метрики: {unknownRefs.join(', ')}
        </p>
      )}

      {/* Raw formula preview */}
      {tokens.length > 0 && (
        <p className="text-[10px] text-muted-foreground font-mono break-all">
          {tokensToFormula(tokens)}
        </p>
      )}
    </div>
  );
};
