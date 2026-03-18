import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { WikiNavigation } from "@/components/WikiNavigation";
import { WikiPage } from "@/components/WikiPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, Menu, ArrowUp } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { PageHeader } from "@/components/PageHeader";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { getKnowledgeFavorites } from "@/lib/utils";
import { useKbBookmarks } from "@/hooks/useKbBookmarks";
import { toast } from "sonner";
import { internalApiClient, type OutlineDocument } from "@/lib/internalApiClient";

// Динамическое дерево знаний будет загружено из Outline через useKnowledgeBase

export const KnowledgeBase = () => {
  const location = useLocation();
  const pageTitle = (location.state as any)?.fromTitle || "База знаний";
  const {
    documents,
    searchResults,
    searchQuery,
    setSearchQuery,
    documentsLoading,
    documentsError,
    searchLoading,
    documentTree,
    treeLoading,
  } = useKnowledgeBase();

  // Local input state is initialised from persisted query
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Keep input in sync when searchQuery changes elsewhere (e.g. on page revisit)
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Restore previous scroll position once data is ready
  const scrollRestoredRef = useRef(false);
  const getMainScrollElement = () => (
    typeof document !== 'undefined'
      ? (document.querySelector('main.overflow-y-auto') as HTMLElement | null)
      : null
  );
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    let savedPos: string | null = null;
    if (typeof window !== 'undefined') {
      try { savedPos = sessionStorage.getItem('kbScrollTop'); } catch { savedPos = null; }
    }
    if (savedPos === null) return;

    const listReady = searchQuery
      ? (!searchLoading && (searchResults?.results?.length ?? 0) > 0)
      : (!documentsLoading && (documents?.length ?? 0) > 0);

    if (listReady) {
      requestAnimationFrame(() => {
        const el = getMainScrollElement();
        const saved = parseInt(savedPos, 10);
        if (el) {
          el.scrollTo({ top: isNaN(saved) ? 0 : saved });
        } else {
          window.scrollTo(0, isNaN(saved) ? 0 : saved);
        }
        scrollRestoredRef.current = true;
      });
    }
  }, [searchLoading, documentsLoading, searchResults, documents, searchQuery]);

  // Continuously persist scroll position so it is available even when navigation happens via browser history
  useEffect(() => {
    const el = getMainScrollElement();
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        const top = el ? el.scrollTop : window.scrollY;
        try { sessionStorage.setItem('kbScrollTop', String(top)); } catch {}
      }
    };

    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [activePath, setActivePath] = useState<string | undefined>(undefined);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const [favoritesTick, setFavoritesTick] = useState(0);
  const { items: serverBookmarks, isBookmarked, setBookmark, loading: bookmarksLoading } = useKbBookmarks();

  useEffect(() => {
    const el = getMainScrollElement();
    const readTop = () => (el ? el.scrollTop : window.scrollY);
    const onScroll = () => setScrolled(readTop() > 80);

    if (el) {
      el.addEventListener('scroll', onScroll);
      onScroll();
      return () => el.removeEventListener('scroll', onScroll);
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearchQuery);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    setSearchQuery("");
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem('kbSearchQuery'); } catch {}
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Wiki-интерфейс: слева навигация, справа контент
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('kb_favorites_filter') === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem('kb_favorites_filter', favoritesOnly ? '1' : '0'); } catch {}
    }
  }, [favoritesOnly]);

  const baseDocuments = searchQuery
    ? (searchResults?.results?.map(r => r.document) || [])
    : (documents || []);

  // Загружаем недостающие документы из закладок, если они не попали в первые 100
  const [extraFavoriteDocs, setExtraFavoriteDocs] = useState<OutlineDocument[]>([]);
  const [loadingExtraFavorites, setLoadingExtraFavorites] = useState(false);

  useEffect(() => {
    const loadMissingFavorites = async () => {
      try {
        setLoadingExtraFavorites(true);
        const favorites = Array.from(getKnowledgeFavorites());
        if (!favorites || favorites.length === 0) {
          setExtraFavoriteDocs([]);
          return;
        }

        const baseIds = new Set((baseDocuments || []).map(d => d.id));
        const missingIds = favorites.filter(id => !baseIds.has(id));

        if (missingIds.length === 0) {
          setExtraFavoriteDocs([]);
          return;
        }

        const results = await Promise.allSettled(missingIds.map(id => internalApiClient.getOutlineDocument(id)));
        const okDocs = results
          .filter(r => r.status === 'fulfilled')
          .map(r => (r as PromiseFulfilledResult<OutlineDocument>).value)
          .filter(Boolean);
        setExtraFavoriteDocs(okDocs);
      } catch {
        setExtraFavoriteDocs([]);
      } finally {
        setLoadingExtraFavorites(false);
      }
    };

    if (favoritesOnly && (!searchQuery || searchQuery.length < 2)) {
      loadMissingFavorites();
    } else {
      setExtraFavoriteDocs([]);
    }
  }, [favoritesOnly, baseDocuments, searchQuery, favoritesTick]);

  const showDocuments = favoritesOnly
    ? (() => {
        const favFromBase = baseDocuments.filter(d => isBookmarked(d.id));
        const existingIds = new Set(favFromBase.map(d => d.id));
        const extras = extraFavoriteDocs.filter(d => !existingIds.has(d.id));
        return [...favFromBase, ...extras];
      })()
    : baseDocuments;

  // Subscribe to favorites changes to re-render list
  useEffect(() => {
    const onFav = () => setFavoritesTick((t) => t + 1);
    window.addEventListener('kb:favorites-changed', onFav as any);
    const onStorage = (ev: StorageEvent) => { if (ev.key === 'kb_favorites_v1') setFavoritesTick((t) => t + 1); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('kb:favorites-changed', onFav as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Боковая панель (адаптивная) */}
      <WikiNavigation
        tree={documentTree as any}
        treeLoading={treeLoading}
        activePath={activePath}
        onSelect={(path) => setActivePath(path)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {/* Основная страница */}
      <main className="p-4 flex-1 flex flex-col items-center bg-gradient-to-br from-blue-100/60 via-[hsl(var(--background))] to-purple-100/60 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen w-full overflow-x-hidden">
        {/* Header */}
        <div className="relative w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Открыть меню"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 lg:hidden"
          >
            <Menu size={20} />
          </Button>
          {scrolled && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Наверх"
              onClick={() => {
                const el = getMainScrollElement();
                if (el) {
                  el.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30"
            >
              <ArrowUp size={20} />
            </Button>
          )}
          <div className={
            `sticky top-0 z-20 transition-all px-0 ` +
            (scrolled
              ? 'bg-white/30 dark:bg-gray-900/20 backdrop-blur-sm backdrop-saturate-150 border-b border-white/20 dark:border-white/10 shadow-md'
              : 'bg-transparent')
          }>
            <div className="relative">
              <PageHeader title={pageTitle} className="!mt-0 !mb-0 pr-12" />
              {/* Favorites filter toggle near burger icon area */}
              <button
                type="button"
                aria-label={favoritesOnly ? 'Показать все' : 'Показать избранные'}
                title={favoritesOnly ? 'Показать все' : 'Показать избранные'}
                onClick={() => setFavoritesOnly(v => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600"
              >
                {favoritesOnly ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4-8 4V4a2 2 0 0 1 2-2z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col items-center">
          {/* Поиск по базе знаний */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-5xl px-4 md:px-8 pt-3 pb-2 lg:pt-4 lg:sticky lg:top-0 z-20"
          >
            <div className="relative flex items-center bg-white/60 dark:bg-gray-900/40 backdrop-blur-[7px] backdrop-saturate-150 border border-white/10 rounded-md">
              <Input
                type="text"
                placeholder="Поиск в базе знаний..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-9 pr-40 text-base bg-transparent"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                {localSearchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="h-8 px-2 text-gray-500 hover:text-gray-700"
                  >
                    Очистить
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={searchLoading}
                  className="h-8 px-3"
                >
                  {searchLoading ? (
                    <span className="animate-spin"><Search size={16} /></span>
                  ) : (
                    "Найти"
                  )}
                </Button>
              </div>
            </div>
          </form>
          {/* Контент базы знаний */}
          {documentsLoading ? (
            <div className="flex justify-center items-center py-24 w-full">
              <Spinner size="xl" />
            </div>
          ) : (
            <WikiPage>
              <div>
                {searchResults && searchResults.totalCount !== undefined && (
                  <div className="flex justify-end mb-2">
                    <Badge variant="secondary">{searchResults.totalCount} найдено</Badge>
                  </div>
                )}
                {showDocuments.length === 0 ? (
                  searchLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {searchQuery ? "Ничего не найдено" : "Документы не найдены"}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery
                          ? "Попробуйте изменить поисковый запрос"
                          : "В базе знаний пока нет документов"}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col space-y-3">
                    {showDocuments.map((document) => (
                      <Link
                        key={document.id}
                        to={`/knowledge/${encodeURIComponent(document.id)}`}
                        className="cursor-pointer"
                        onClick={() => {
                          /* remember current scroll before leaving so we can restore later */
                          if (typeof window !== 'undefined') {
                            const el = getMainScrollElement();
                            const top = el ? el.scrollTop : window.scrollY;
                            try { sessionStorage.setItem('kbScrollTop', String(top)); } catch {}
                          }
                        }}
                      >
                        <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm hover:bg-blue-50 transition">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                              {document.emoji && <span className="mr-2">{document.emoji}</span>}
                              {document.title.replace(/^#+\s*/, "")}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(document.updatedAt)}</span>
                              <span>•</span>
                              <span className="whitespace-nowrap">{document.updatedBy?.name || "Неизвестно"}</span>
                            </div>
                          </div>
                          {/* Bookmark toggle on list card */}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currently = isBookmarked(document.id);
                              const title = document.title?.replace(/^#+\s*/, "") || undefined;
                              const res = await setBookmark({ articleId: document.id, bookmarked: !currently, title });
                              if (res.ok) {
                                setFavoritesTick((t) => t + 1);
                                toast.success(!currently ? 'Добавлено в закладки' : 'Удалено из закладок');
                              } else {
                                toast.error('Не удалось обновить закладку');
                              }
                            }}
                            title={isBookmarked(document.id) ? 'Убрать из закладок' : 'В закладки'}
                            className="ml-2 p-2 rounded hover:bg-gray-100 text-blue-600"
                            aria-label="Закладка"
                          >
                            {isBookmarked(document.id) ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4-8 4V4a2 2 0 0 1 2-2z"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            )}
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </WikiPage>
          )}
        </div>
      </main>
    </div>
  );
}; 