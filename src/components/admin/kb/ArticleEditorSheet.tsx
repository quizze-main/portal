import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/Spinner';
import { useKbArticleEditor } from '@/hooks/useKbArticleEditor';

const BlockNoteEditor = lazy(() => import('./BlockNoteEditor'));

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-red-500">Ошибка загрузки редактора: {this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Collection {
  id: string;
  name: string;
}

interface ArticleEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass article name/id to edit, or undefined/null for create mode */
  articleName?: string | null;
  collections: Collection[];
}

export const ArticleEditorSheet: React.FC<ArticleEditorSheetProps> = ({
  open,
  onOpenChange,
  articleName,
  collections,
}) => {
  const isCreateMode = !articleName;
  const { article, updateMutation, createMutation } = useKbArticleEditor(articleName || undefined);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  // Populate form when article loads
  useEffect(() => {
    if (article.data && !isCreateMode) {
      setTitle(article.data.title || '');
      setContent(article.data.content || '');
      setPublished(!!article.data.published);
      setCollectionId(article.data.collectionId || '');
    }
  }, [article.data, isCreateMode]);

  // Reset form when opening in create mode
  useEffect(() => {
    if (open && isCreateMode) {
      setTitle('');
      setContent('');
      setPublished(false);
      setCollectionId(collections[0]?.id || '');
    }
  }, [open, isCreateMode]);

  const isSaving = updateMutation.isPending || createMutation.isPending;

  const handleSave = async () => {
    if (isCreateMode) {
      await createMutation.mutateAsync({ title, content, published: published ? 1 : 0, collectionId });
    } else {
      await updateMutation.mutateAsync({ title, content, published: published ? 1 : 0 });
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-full !max-w-full sm:!max-w-[900px] flex flex-col overflow-hidden"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle>{isCreateMode ? 'Новая статья' : 'Редактирование статьи'}</SheetTitle>
          <SheetDescription className="sr-only">
            {isCreateMode ? 'Создание новой статьи' : 'Редактирование существующей статьи'}
          </SheetDescription>
        </SheetHeader>

        {/* Loading state for edit mode */}
        {!isCreateMode && article.isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="md" />
          </div>
        )}

        {/* Error state */}
        {!isCreateMode && article.isError && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-red-500">Ошибка загрузки статьи</p>
          </div>
        )}

        {/* Form — shown when data is ready or in create mode */}
        {(isCreateMode || article.data) && (
          <>
            <div className="space-y-4 shrink-0 pt-2">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Название</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название статьи"
                />
              </div>

              {/* Collection selector */}
              {isCreateMode && collections.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Коллекция</label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Collection display for edit mode */}
              {!isCreateMode && collectionId && (
                <div className="text-xs text-muted-foreground">
                  Коллекция: {collections.find(c => c.id === collectionId)?.name || collectionId}
                </div>
              )}

              {/* Published toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={published} onCheckedChange={setPublished} id="published-switch" />
                <label htmlFor="published-switch" className="text-sm">
                  Опубликовано
                </label>
              </div>
            </div>

            {/* Block editor */}
            <div className="flex-1 min-h-0 pt-4 overflow-auto">
              <EditorErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Spinner size="md" /></div>}>
                  <BlockNoteEditor
                    key={articleName || 'new'}
                    initialMarkdown={isCreateMode ? '' : (article.data?.content || '')}
                    onChange={setContent}
                  />
                </Suspense>
              </EditorErrorBoundary>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 shrink-0">
              {(updateMutation.isError || createMutation.isError) && (
                <p className="text-xs text-red-500 mr-auto">Ошибка сохранения</p>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !title.trim() || (isCreateMode && !collectionId)}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
