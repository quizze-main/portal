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
  // Pointer-based drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<(HTMLElement | null)[]>([]);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

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

  // ── Pointer-based Drag & Drop ──
  // Calculate drop index based on pointer position relative to token elements
  const calcDropIndex = useCallback((clientX: number, clientY: number): number => {
    const refs = tokenRefs.current;
    if (!refs.length || !containerRef.current) return tokens.length;

    // Find closest insertion point by checking midpoints of each token
    let bestIdx = tokens.length;
    let bestDist = Infinity;

    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(clientX - midX) + Math.abs(clientY - midY) * 2;

      // Before this token
      if (clientX < midX && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
      // After this token
      const distAfter = Math.abs(clientX - rect.right) + Math.abs(clientY - midY) * 2;
      if (clientX >= midX && distAfter < bestDist) {
        bestDist = distAfter;
        bestIdx = i + 1;
      }
    }

    return bestIdx;
  }, [tokens.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    // Only left mouse button or touch
    if (e.button !== 0) return;
    // Don't start drag on X button
    if ((e.target as HTMLElement).closest('button[data-remove]')) return;

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragIdx(idx);

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIdx === null || !dragStartPos.current) return;

    // Require minimum 5px movement to start drag (prevents accidental drags)
    if (!isDraggingRef.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx + dy < 5) return;
      isDraggingRef.current = true;
    }

    const newDropTarget = calcDropIndex(e.clientX, e.clientY);
    // Don't show drop indicator at the dragged item's current position or position+1
    if (newDropTarget === dragIdx || newDropTarget === dragIdx + 1) {
      setDropTarget(null);
    } else {
      setDropTarget(newDropTarget);
    }
  }, [dragIdx, calcDropIndex]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragIdx === null) return;

    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

    if (isDraggingRef.current && dropTarget !== null) {
      const fromIdx = dragIdx;
      const toIdx = dropTarget;
      setTokens(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
        next.splice(insertAt, 0, moved);
        return next;
      });
      setCursor(null);
    }

    isDraggingRef.current = false;
    dragStartPos.current = null;
    setDragIdx(null);
    setDropTarget(null);
  }, [dragIdx, dropTarget]);

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
    const isDragging = isDraggingRef.current && dragIdx === idx;
    const pointerProps = {
      onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, idx),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      style: { touchAction: 'none' as const },
    };

    if (token.type === 'metric') {
      const label = metricNameMap[token.code] || token.code;
      const isUnknown = unknownRefs.includes(token.code);
      const accessorLabel = token.accessor ? ACCESSOR_LABELS[token.accessor] : null;
      return (
        <Badge
          key={idx}
          ref={(el: HTMLElement | null) => { tokenRefs.current[idx] = el; }}
          variant="secondary"
          className={cn(
            'gap-0.5 pr-1 text-xs font-normal cursor-grab active:cursor-grabbing select-none',
            isDragging && 'opacity-40 scale-95',
            isUnknown && 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300',
          )}
          {...pointerProps}
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
            data-remove
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
          ref={el => { tokenRefs.current[idx] = el; }}
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none',
            isDragging && 'opacity-40 scale-95',
          )}
          {...pointerProps}
        >
          <GripVertical className="h-2.5 w-2.5 text-blue-400/50 shrink-0" />
          {token.value}(
          <button
            type="button"
            data-remove
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
        ref={el => { tokenRefs.current[idx] = el; }}
        className={cn(
          'inline-flex items-center gap-0.5 text-xs font-mono bg-muted rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none',
          isDragging && 'opacity-40 scale-95',
        )}
        {...pointerProps}
      >
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
        {token.value}
        <button
          type="button"
          data-remove
          onClick={(e) => { e.stopPropagation(); removeToken(idx); }}
          className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </span>
    );
  };

  // ── Render drop indicator ──
  const renderDropIndicator = (position: number) => {
    if (dropTarget !== position || !isDraggingRef.current) return null;
    return (
      <div
        key={`drop-${position}`}
        className="w-1 h-6 rounded-full bg-blue-500 shrink-0 animate-pulse mx-0.5"
      />
    );
  };

  // ── Render cursor indicator ──
  const renderCursor = (position: number) => {
    if (cursor !== position || isDraggingRef.current) return null;
    return (
      <div
        key={`cursor-${position}`}
        className="w-0.5 h-5 rounded-full bg-primary animate-pulse shrink-0 mx-0.5"
      />
    );
  };

  // Keep tokenRefs in sync with token count
  useEffect(() => {
    tokenRefs.current = tokenRefs.current.slice(0, tokens.length);
  }, [tokens.length]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">
        Формула
      </label>

      {/* Token chips area */}
      <div
        ref={containerRef}
        className="min-h-[40px] flex flex-wrap items-center gap-y-1 p-2 rounded-md border bg-background max-h-[120px] overflow-y-auto cursor-text"
        onClick={handleContainerClick}
      >
        {tokens.length === 0 && (
          <span className="text-xs text-muted-foreground">Добавьте метрики и операторы...</span>
        )}
        {tokens.map((token, idx) => (
          <React.Fragment key={idx}>
            {renderDropIndicator(idx)}
            {renderCursor(idx)}
            <div className="mx-0.5">
              {renderToken(token, idx)}
            </div>
          </React.Fragment>
        ))}
        {tokens.length > 0 && (
          <>
            {renderDropIndicator(tokens.length)}
            {renderCursor(tokens.length)}
          </>
        )}
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
