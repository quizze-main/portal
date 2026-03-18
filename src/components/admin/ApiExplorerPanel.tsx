import React, { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { internalApiClient } from '@/lib/internalApiClient';
import JsonTreeViewer from './JsonTreeViewer';

interface ApiExplorerPanelProps {
  sourceId: string;
  initialPath?: string;
  onPathSelect?: (path: string) => void;
  selectedPaths?: string[];
}

const ApiExplorerPanel: React.FC<ApiExplorerPanelProps> = ({
  sourceId,
  initialPath = '',
  onPathSelect,
  selectedPaths,
}) => {
  const [path, setPath] = useState(initialPath);
  const [method, setMethod] = useState<string>('GET');
  const [isLoading, setIsLoading] = useState(false);
  const [responseData, setResponseData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');

  const handleSend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResponseData(null);
    try {
      const result = await internalApiClient.testDataSourceRequest(
        sourceId,
        path || undefined,
        method,
      );
      if (result.data !== undefined) {
        setResponseData(result.data);
        setLatency(result.latency ?? null);
        setTruncated(result.truncated ?? false);
        if (!result.ok) {
          setError(`HTTP ${result.status || '?'}`);
        }
      } else {
        setError(result.error || 'Request failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  }, [sourceId, path, method]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleSend();
  }, [handleSend, isLoading]);

  return (
    <div className="space-y-2">
      {/* Request bar */}
      <div className="flex items-center gap-2">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="h-7 text-xs w-[75px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={path}
          onChange={e => setPath(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="/api/v4/leads"
          className="text-xs h-7 font-mono flex-1"
        />
        <Button
          size="sm"
          variant="default"
          onClick={handleSend}
          disabled={isLoading}
          className="text-xs h-7 shrink-0"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </Button>
      </div>

      {/* Status line */}
      {(error || responseData != null) && (
        <div className="flex items-center gap-2 text-xs">
          {error && !responseData ? (
            <span className="text-red-500">{error}</span>
          ) : error ? (
            <span className="text-amber-600">{error}{latency != null && ` (${latency}ms)`}</span>
          ) : (
            <span className="text-green-600">OK{latency != null && ` (${latency}ms)`}</span>
          )}
          {truncated && <span className="text-amber-500 text-[10px]">truncated</span>}

          {responseData != null && (
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`text-[10px] px-1.5 py-0.5 rounded ${viewMode === 'tree' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Tree
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`text-[10px] px-1.5 py-0.5 rounded ${viewMode === 'raw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Raw
              </button>
            </div>
          )}
        </div>
      )}

      {/* Response viewer */}
      {responseData != null && (
        <div className="border rounded-md overflow-hidden">
          {viewMode === 'tree' ? (
            <JsonTreeViewer
              data={responseData}
              onPathSelect={onPathSelect}
              selectedPaths={selectedPaths}
            />
          ) : (
            <pre className="bg-muted p-2 text-[10px] font-mono max-h-[400px] overflow-auto whitespace-pre-wrap">
              {typeof responseData === 'string'
                ? responseData
                : JSON.stringify(responseData, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiExplorerPanel;
