import React, { useState } from 'react';
import { Spinner } from '@/components/Spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Folder, FolderOpen } from 'lucide-react';
import { useAdminKbArticles } from '@/hooks/useAdminKbArticles';
import { ArticleEditorSheet } from './ArticleEditorSheet';

export const AdminKbArticles: React.FC = () => {
  const { articles, collections, collectionFilter, setCollectionFilter, collectionCounts } = useAdminKbArticles();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<string | null>(null);

  const handleOpenEditor = (name?: string) => {
    setEditingArticle(name || null);
    setEditorOpen(true);
  };

  // Total count from all loaded articles
  const totalCount = Array.from(collectionCounts.values()).reduce((a, b) => a + b, 0);

  // Active collection name for header
  const activeCollectionName = collectionFilter
    ? collections.data?.find((c) => c.id === collectionFilter)?.name
    : undefined;

  const articleCount = articles.data?.length ?? 0;

  return (
    <div className="flex gap-4 flex-col sm:flex-row">
      {/* ── Mobile: horizontal scroll pills ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
        <button
          onClick={() => setCollectionFilter('')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            collectionFilter === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Все ({totalCount})
        </button>
        {(collections.data || []).map((col) => (
          <button
            key={col.id}
            onClick={() => setCollectionFilter(col.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              collectionFilter === col.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {col.name} ({collectionCounts.get(col.id) ?? 0})
          </button>
        ))}
      </div>

      {/* ── Desktop: collection sidebar ── */}
      <aside className="hidden sm:block sm:w-52 shrink-0">
        <div className="rounded-lg border bg-card p-2 space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 pt-1 pb-1.5">
            Коллекции
          </p>

          {/* "All" item */}
          <button
            onClick={() => setCollectionFilter('')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
              collectionFilter === ''
                ? 'bg-primary/10 text-primary font-medium border-l-[3px] border-primary'
                : 'hover:bg-muted/50 border-l-[3px] border-transparent'
            }`}
          >
            {collectionFilter === '' ? (
              <FolderOpen className="w-4 h-4 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate flex-1">Все</span>
            <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
              {totalCount}
            </Badge>
          </button>

          {/* Collection items */}
          {(collections.data || []).map((col) => {
            const isActive = collectionFilter === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setCollectionFilter(col.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium border-l-[3px] border-primary'
                    : 'hover:bg-muted/50 border-l-[3px] border-transparent'
                }`}
              >
                {isActive ? (
                  <FolderOpen className="w-4 h-4 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate flex-1">{col.name}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
                  {collectionCounts.get(col.id) ?? 0}
                </Badge>
              </button>
            );
          })}

          {collections.isLoading && (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main: articles card ── */}
      <div className="flex-1 min-w-0">
        <div className="rounded-lg border bg-card p-4">
          {/* Card header */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-medium truncate">
                {activeCollectionName || 'Все статьи'}
              </h3>
              {!articles.isLoading && (
                <span className="text-xs text-muted-foreground shrink-0">({articleCount})</span>
              )}
            </div>
            <Button size="sm" onClick={() => handleOpenEditor()} className="h-7 text-xs gap-1 shrink-0">
              <Plus className="w-3.5 h-3.5" />
              Новая статья
            </Button>
          </div>

          {/* Loading */}
          {articles.isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          )}

          {/* Error */}
          {articles.isError && (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-red-500">Ошибка загрузки статей</p>
              <p className="text-xs text-muted-foreground mt-1">Попробуйте обновить страницу</p>
            </div>
          )}

          {/* Empty */}
          {articles.data && articles.data.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Нет статей</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {collectionFilter ? 'В этой коллекции пока нет статей' : 'Создайте первую статью'}
              </p>
            </div>
          )}

          {/* Table */}
          {articles.data && articles.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-3 font-medium">Название</th>
                    <th className="text-left py-2 pr-3 font-medium">Статус</th>
                    <th className="text-left py-2 font-medium hidden sm:table-cell">Обновлён</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.data.map((article) => (
                    <tr
                      key={article.name}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => handleOpenEditor(article.name)}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                          <span className="truncate">{article.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {article.published ? (
                          <Badge variant="default" className="text-[10px] bg-green-600">Опубл.</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Черновик</Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {article.modified
                          ? new Date(article.modified).toLocaleDateString('ru-RU')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Editor sheet */}
      <ArticleEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        articleName={editingArticle}
        collections={collections.data || []}
      />
    </div>
  );
};
