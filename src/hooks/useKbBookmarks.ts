import { useEffect, useMemo, useState } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';

export function useKbBookmarks() {
  const { employee } = useEmployee();
  const employeeId = employee?.name; // e.g., HR-EMP-00002

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<{ name?: string; article_id: string; title?: string | null; updated_at?: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);

  const idSet = useMemo(() => new Set(items.map(i => i.article_id)), [items]);

  const reload = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await internalApiClient.getKbBookmarks(employeeId);
      setItems(list || []);
    } catch (e) {
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      reload();
    } else {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const isBookmarked = (articleId: string) => idSet.has(articleId);

  const setBookmark = async (params: { articleId: string; bookmarked: boolean; title?: string }) => {
    if (!employeeId) return { ok: false } as const;
    const res = await internalApiClient.setKbBookmark({
      employeeId,
      articleId: params.articleId,
      bookmarked: params.bookmarked,
      title: params.title,
    });
    if (res && res.ok) {
      if (params.bookmarked) {
        setItems(prev => {
          const exists = prev.some(i => i.article_id === params.articleId);
          if (exists) return prev.map(i => i.article_id === params.articleId ? { ...i, title: params.title ?? i.title } : i);
          return [...prev, { article_id: params.articleId, title: params.title ?? null, updated_at: res.updated_at }];
        });
      } else {
        setItems(prev => prev.filter(i => i.article_id !== params.articleId));
      }
    }
    return { ok: !!res?.ok } as const;
  };

  return { loading, error, items, isBookmarked, reload, setBookmark };
}


