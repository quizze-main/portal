import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { ImportDropZone } from './ImportDropZone';
import { useAdminKbImport } from '@/hooks/useAdminKbImport';
import { internalApiClient } from '@/lib/internalApiClient';
import type { KbImportPreviewFile } from '@/lib/internalApiClient';

export const AdminKbImport: React.FC = () => {
  const { previewMutation, importMutation } = useAdminKbImport();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<KbImportPreviewFile[]>([]);
  const [collectionId, setCollectionId] = useState('');

  const collections = useQuery({
    queryKey: ['admin', 'kb', 'collections'],
    queryFn: () => internalApiClient.getKbCollections(),
    staleTime: 60_000,
  });

  // Set default collection when loaded
  React.useEffect(() => {
    if (collections.data?.length && !collectionId) {
      setCollectionId(collections.data[0].id);
    }
  }, [collections.data]);

  const handleFiles = async (newFiles: File[]) => {
    setFiles(newFiles);
    try {
      const result = await previewMutation.mutateAsync(newFiles);
      setPreviews(result.files || []);
    } catch {
      setPreviews([]);
    }
  };

  const handleImport = async () => {
    if (!files.length || !collectionId) return;
    await importMutation.mutateAsync({ files, collectionId });
  };

  const handleReset = () => {
    setFiles([]);
    setPreviews([]);
    importMutation.reset();
    previewMutation.reset();
  };

  const importDone = importMutation.isSuccess;
  const importResult = importMutation.data;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <ImportDropZone
        onFiles={handleFiles}
        disabled={importMutation.isPending}
      />

      {/* Preview loading */}
      {previewMutation.isPending && (
        <p className="text-sm text-muted-foreground">Анализ файлов...</p>
      )}

      {/* Preview table */}
      {previews.length > 0 && !importDone && (
        <div>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Предпросмотр ({previews.length} файлов)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-3 font-medium">Файл</th>
                  <th className="text-left py-2 pr-3 font-medium">Заголовок</th>
                  <th className="text-left py-2 pr-3 font-medium">Размер</th>
                  <th className="text-left py-2 font-medium">Строк</th>
                </tr>
              </thead>
              <tbody>
                {previews.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[150px]">{p.filename}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 truncate max-w-[200px]">{p.title}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {(p.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2 text-muted-foreground">{p.lineCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Collection selector */}
          <div className="mt-4 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Импортировать в коллекцию:</label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {(collections.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importMutation.isPending || !collectionId}
            >
              {importMutation.isPending ? 'Импорт...' : `Импортировать (${previews.length})`}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Очистить
            </Button>
          </div>
        </div>
      )}

      {/* Import result */}
      {importDone && importResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">
              Создано статей: {importResult.created}
              {importResult.errors.length > 0 && `, ошибок: ${importResult.errors.length}`}
            </span>
          </div>

          {importResult.errors.length > 0 && (
            <div className="space-y-1">
              {importResult.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{err.filename}: {err.error}</span>
                </div>
              ))}
            </div>
          )}

          <Button size="sm" variant="outline" onClick={handleReset}>
            Загрузить ещё
          </Button>
        </div>
      )}

      {/* Import error */}
      {importMutation.isError && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          Ошибка импорта: {(importMutation.error as Error)?.message || 'Unknown error'}
        </div>
      )}
    </div>
  );
};
