import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonTreeViewerProps {
  data: unknown;
  onPathSelect?: (path: string) => void;
  selectedPaths?: string[];
  maxInitialDepth?: number;
  className?: string;
}

// Build a JSONPath segment: key with dots, or [index] for arrays
function appendPath(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`;
  // If key contains dots or brackets, use bracket notation
  if (/[.\[\]]/.test(key)) return `${parent}["${key}"]`;
  return parent ? `${parent}.${key}` : key;
}

function getTypeColor(value: unknown): string {
  if (value === null) return 'text-gray-400 italic';
  if (typeof value === 'string') return 'text-green-600 dark:text-green-400';
  if (typeof value === 'number') return 'text-blue-600 dark:text-blue-400';
  if (typeof value === 'boolean') return 'text-purple-600 dark:text-purple-400';
  return '';
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    if (value.length > 120) return `"${value.slice(0, 120)}..."`;
    return `"${value}"`;
  }
  return String(value);
}

function isPrimitive(value: unknown): boolean {
  return value === null || typeof value !== 'object';
}

// ── Individual tree node ──
const JsonNode: React.FC<{
  keyName: string | number | null;
  value: unknown;
  path: string;
  depth: number;
  maxInitialDepth: number;
  onPathSelect?: (path: string) => void;
  selectedPaths?: string[];
  isLast?: boolean;
}> = ({ keyName, value, path, depth, maxInitialDepth, onPathSelect, selectedPaths, isLast }) => {
  const [expanded, setExpanded] = useState(depth < maxInitialDepth);
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const isSelected = selectedPaths?.includes(path);
  const isObj = value !== null && typeof value === 'object';
  const isArr = Array.isArray(value);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!path) return;
    navigator.clipboard.writeText(path).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onPathSelect?.(path);
  }, [path, onPathSelect]);

  // Primitive value
  if (isPrimitive(value)) {
    return (
      <div
        className={cn(
          'group flex items-center gap-1 py-[1px] px-1 rounded cursor-pointer hover:bg-primary/5 transition-colors',
          isSelected && 'bg-primary/10 border-l-2 border-primary'
        )}
        onClick={handleCopy}
        title={`Click to copy: ${path}`}
      >
        <span className="w-4" /> {/* indent spacer for alignment */}
        {keyName != null && (
          <span className="text-muted-foreground shrink-0">
            {typeof keyName === 'number' ? `${keyName}` : keyName}
            <span className="text-muted-foreground/60">: </span>
          </span>
        )}
        <span className={getTypeColor(value)}>{formatValue(value)}</span>
        <span className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-muted-foreground font-mono">{path}</span>
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
        </span>
      </div>
    );
  }

  // Object or Array
  const entries = isArr
    ? (value as unknown[]).map((v, i) => [i, v] as [number, unknown])
    : Object.entries(value as Record<string, unknown>);
  const totalEntries = entries.length;
  const INITIAL_SHOW = 20;
  const visibleEntries = showMore ? entries : entries.slice(0, INITIAL_SHOW);
  const hasMore = totalEntries > INITIAL_SHOW && !showMore;

  const summary = isArr
    ? `Array(${totalEntries})`
    : `{${totalEntries} keys}`;

  return (
    <div className={cn(isSelected && 'bg-primary/5 border-l-2 border-primary rounded')}>
      {/* Toggle header */}
      <div
        className="group flex items-center gap-1 py-[1px] px-1 rounded cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        }
        {keyName != null && (
          <span className="text-muted-foreground shrink-0">
            {typeof keyName === 'number' ? `${keyName}` : keyName}
            <span className="text-muted-foreground/60">: </span>
          </span>
        )}
        {!expanded && (
          <span className="text-muted-foreground/70 text-[10px]">{summary}</span>
        )}
        {expanded && isArr && (
          <span className="text-muted-foreground/50 text-[10px]">[{totalEntries}]</span>
        )}
        {path && (
          <span
            className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0"
            onClick={handleCopy}
          >
            <span className="text-[9px] text-muted-foreground font-mono">{path}</span>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && (
        <div className="pl-4 border-l border-border/40 ml-2">
          {visibleEntries.map(([k, v], idx) => (
            <JsonNode
              key={typeof k === 'number' ? k : String(k)}
              keyName={k}
              value={v}
              path={appendPath(path, k)}
              depth={depth + 1}
              maxInitialDepth={maxInitialDepth}
              onPathSelect={onPathSelect}
              selectedPaths={selectedPaths}
              isLast={idx === visibleEntries.length - 1 && !hasMore}
            />
          ))}
          {hasMore && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowMore(true); }}
              className="text-[10px] text-primary hover:underline py-1 px-1"
            >
              Show {totalEntries - INITIAL_SHOW} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ──
const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({
  data,
  onPathSelect,
  selectedPaths,
  maxInitialDepth = 2,
  className,
}) => {
  if (data == null) {
    return <div className="text-xs text-muted-foreground italic p-2">No data</div>;
  }

  return (
    <div className={cn('text-xs font-mono max-h-[400px] overflow-auto p-1', className)}>
      <JsonNode
        keyName={null}
        value={data}
        path=""
        depth={0}
        maxInitialDepth={maxInitialDepth}
        onPathSelect={onPathSelect}
        selectedPaths={selectedPaths}
      />
    </div>
  );
};

export default JsonTreeViewer;
