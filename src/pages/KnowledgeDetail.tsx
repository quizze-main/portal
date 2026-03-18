import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  BookOpen,
  Menu,
  ChevronsLeft,
  ArrowUp,
  Copy,
  
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { type OutlineDocument, type OutlineCollection } from "@/lib/internalApiClient";
import { MarkdownWithAttachments } from "@/components/MarkdownWithAttachments";
import { WikiNavigation } from "@/components/WikiNavigation";
import { internalApiClient } from "@/lib/internalApiClient";
import { toast } from "sonner";
import { useKbBookmarks } from "@/hooks/useKbBookmarks";

// (Removed custom PaperPlaneIcon; using lucide-react Send icon instead)

// Share icon using mask so it inherits currentColor (blue like the copy icon)
// Slightly scale up so it выглядит как штриховые иконки такого же бокса
const ShareExternalIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
  <span
    aria-label="Поделиться"
    className={className}
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      backgroundColor: 'currentColor',
      WebkitMaskImage: 'url(/photo_2025-09.svg)',
      maskImage: 'url(/photo_2025-09.svg)',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      transform: 'scale(1.05)',
      transformOrigin: 'center',
    }}
  />
);

export const KnowledgeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchDocumentMutation, fetchDocumentContentMutation, documentTree, treeLoading } = useKnowledgeBase();
  const [currentDoc, setCurrentDoc] = useState<OutlineDocument | OutlineCollection | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { isBookmarked, setBookmark } = useKbBookmarks();
  const getMainScrollElement = () => (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
      ? (window.document.querySelector('main.overflow-y-auto') as HTMLElement | null)
      : null
  );

  // Обработчик скролла для сжатия хэдера
  useEffect(() => {
    const el = getMainScrollElement();
    const readTop = () => (el ? el.scrollTop : window.scrollY);
    const onScroll = () => setScrolled(readTop() > 50);
    if (el) {
      el.addEventListener('scroll', onScroll);
      onScroll();
      return () => el.removeEventListener('scroll', onScroll);
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const isCollection = location.pathname.includes('/knowledge/collection/');

  // Текст для кнопки «Назад»: если пришли из другой статьи, показываем её название (с обрезкой до 15 символов)
  const fromTitle = (location.state as any)?.fromTitle as string | undefined;
  const cameFromArticle = Boolean((location.state as any)?.fromArticle);
  const backLabel = fromTitle
    ? (fromTitle.length > 15 ? `${fromTitle.slice(0, 15)}...` : fromTitle)
    : 'База знаний';

  // Кнопку «к базе знаний» показываем только если пришли из другой статьи
  const showBaseButton = cameFromArticle;

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  // Sync server favorite state when document changes
  useEffect(() => {
    if (currentDoc && 'id' in currentDoc) {
      setIsFavorite(isBookmarked((currentDoc as any).id));
    }
  }, [currentDoc]);

  // No cross-tab localStorage sync needed; state is server-driven

  const loadDocument = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Загружаем информацию о документе или коллекции
      const decodedId = decodeURIComponent(id);
      let docData: OutlineDocument | OutlineCollection;
      if (isCollection) {
        docData = await internalApiClient.getOutlineCollection(decodedId);
      } else {
        docData = await fetchDocumentMutation.mutateAsync(decodedId);
      }
      setCurrentDoc(docData);
      
      if (!isCollection) {
        // Загружаем содержимое документа
        const contentData = await fetchDocumentContentMutation.mutateAsync(decodedId);
        setContent(contentData);
      } else {
        setContent('');
      }
    } catch (err) {
      console.error('Ошибка загрузки документа:', err);
      setError('Не удалось загрузить документ');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Перед рендером markdown заменяем все '\n' и '/n' на обычные переводы строк
  const normalizedContent = (content || '').replace(/\\n|\n|\/n/g, '\n');

  // Long-press handling for "Открыть в Outline": short press opens, long press copies link
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const LONG_PRESS_MS = 1500;

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  const getOutlineTargetUrl = () => {
    const base = import.meta.env.VITE_OUTLINE_BASE_URL || "";
    const urlPart = (currentDoc as any)?.url as string;
    return base ? `${base}${urlPart}` : urlPart;
  };

  const handleOpenOutlinePointerDown = () => {
    if (!currentDoc || !('url' in (currentDoc as any))) return;
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = (window.setTimeout(async () => {
      longPressTriggeredRef.current = true;
      try {
        const targetUrl = getOutlineTargetUrl();
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(targetUrl);
        } else {
          const ta = document.createElement('textarea');
          ta.value = targetUrl;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        toast.success('Ссылка на статью скопирована');
      } catch (e) {
        console.error('Copy Outline link failed', e);
        toast.error('Не удалось скопировать ссылку');
      }
    }, LONG_PRESS_MS) as unknown) as number;
  };

  const handleOpenOutlinePointerUp = () => {
    if (!currentDoc || !('url' in (currentDoc as any))) return;
    const wasLong = longPressTriggeredRef.current;
    clearLongPressTimer();
    if (!wasLong) {
      const targetUrl = getOutlineTargetUrl();
      window.open(targetUrl, "_blank");
    }
  };

  const handleOpenOutlinePointerCancel = () => {
    clearLongPressTimer();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 w-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !currentDoc) {
    return (
      <div className="px-4 sm:px-6 md:px-8 py-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/knowledge">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 relative top-px" size={20} />
              База знаний
            </Button>
          </Link>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Ошибка загрузки
            </h3>
            <p className="text-red-600 mb-4">
              {error || 'Документ не найден'}
            </p>
            <Button 
              onClick={loadDocument} 
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="mr-2" size={16} />
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 py-4 max-w-4xl mx-auto">
      {/* Side navigation (mobile) */}
      <WikiNavigation
        tree={documentTree as any}
        treeLoading={treeLoading}
        activePath={""}
        onSelect={(path) => {
          const parts = path.split("/");
          const docId = encodeURIComponent(parts[parts.length - 1]);
          // При переходе сохраняем название текущего документа/коллекции, чтобы целевая страница могла показать его в кнопке «назад»
          const currentTitle = isCollection
            ? ('name' in currentDoc! ? (currentDoc as any).name : 'Коллекция')
            : ('title' in currentDoc! ? (currentDoc as any).title : 'Документ');
          // помечаем, что переходим из статьи, чтобы показать кнопку «к базе знаний»
          navigate(`/knowledge/${docId}`, { state: { fromTitle: currentTitle, fromArticle: true } });
          setMobileNavOpen(false);
        }}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Header */}
      <div className={
        `flex items-center gap-3 sticky top-0 z-30 transition-all ` +
        (scrolled
          ? 'bg-white/30 dark:bg-gray-900/20 backdrop-blur-sm backdrop-saturate-150 shadow-md py-2 mb-2'
          : 'bg-transparent py-2 mb-3')
      }>
        <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Открыть меню">
          <Menu size={20} />
        </Button>
        <Button variant="ghost" className="flex items-center gap-1" onClick={() => {
          const hasHistory = typeof window !== 'undefined' && window.history && window.history.length > 1;
          if (cameFromArticle || hasHistory) {
            navigate(-1);
          } else {
            navigate('/knowledge', { replace: true });
          }
        }}>
          <ArrowLeft size={20} className="relative top-px" /> <span>{backLabel}</span>
        </Button>

        {/* Кнопка «К базе знаний»: показываем только если пришли из статьи, сдвигаем вправо */}
        {showBaseButton && (
          <Link to="/knowledge" className="ml-auto">
            <Button variant="ghost" className="flex items-center gap-1" aria-label="К базе знаний">
              <ChevronsLeft size={20} className="relative top-px" /> <span className="hidden sm:inline">К базе</span>
            </Button>
          </Link>
        )}

        {/* Кнопка прокрутки вверх (только в сжатом режиме) */}
        {scrolled && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const el = getMainScrollElement();
              if (el) {
                el.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            aria-label="Наверх"
            className={showBaseButton ? "" : "ml-auto"}
          >
            <ArrowUp size={20} />
          </Button>
        )}
      </div>

      <div className="mb-2">
        <div className="flex items-center gap-2">
          {'id' in currentDoc && (
            <button
              type="button"
              title={isFavorite ? 'Убрать из закладок' : 'В закладки'}
              onClick={async () => {
                const articleId = (currentDoc as any).id as string;
                const title = ('title' in (currentDoc as any)) ? (currentDoc as any).title as string : undefined;
                const res = await setBookmark({ articleId, bookmarked: !isFavorite, title });
                if (res.ok) {
                  setIsFavorite(!isFavorite);
                  toast.success(!isFavorite ? 'Добавлено в закладки' : 'Удалено из закладок');
                } else {
                  toast.error('Не удалось обновить закладку');
                }
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-blue-600"
              style={{ lineHeight: 0 }}
              aria-label={isFavorite ? 'Убрать из закладок' : 'В закладки'}
            >
              {isFavorite ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4-8 4V4a2 2 0 0 1 2-2z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              )}
            </button>
          )}

          <h1 className="page-title text-2xl font-bold break-words leading-tight flex-1">
            {'emoji' in currentDoc && (currentDoc as any).emoji && !isCollection && <span className="mr-3">{(currentDoc as any).emoji}</span>}
            <span className="break-words whitespace-normal">
              {isCollection ? ('name' in currentDoc ? (currentDoc as any).name : 'Коллекция') : ('title' in currentDoc ? (currentDoc as any).title : 'Документ')}
            </span>
          </h1>

          {'id' in currentDoc && (
            <button
              type="button"
              title="Скопировать ссылку"
              onClick={async () => {
                try {
                  const docId = (currentDoc as any).id as string;
                  const baseApp = (import.meta.env as any).VITE_STAFF_PORTAL_URL || window.location.origin;
                  const toBase64Url = (s: string) => {
                    const b64 = btoa(s);
                    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
                  };
                  const encodedId = toBase64Url(docId);
                  const startParam = isCollection ? `kbcol_${encodedId}` : `kbdoc_${encodedId}`;
                  const botUsername = import.meta.env.VITE_TG_BOT_USERNAME as string | undefined;
                  const trimmed = String(baseApp).replace(/\/$/, '');
                  const link = botUsername
                    ? `https://t.me/${botUsername}?startapp=${encodeURIComponent(startParam)}`
                    : `${trimmed}?tgWebAppStartParam=${encodeURIComponent(startParam)}`;
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(link);
                  } else {
                    const ta = document.createElement('textarea');
                    ta.value = link;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  }
                  toast.success('Ссылка скопирована');
                } catch (e) {
                  console.error('Copy link failed', e);
                  toast.error('Не удалось скопировать ссылку');
                }
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-blue-600"
              style={{ lineHeight: 0 }}
            >
              <Copy size={18} />
            </button>
          )}
          {'id' in currentDoc && (
            <button
              type="button"
              title="Поделиться"
              onClick={async () => {
                try {
                  const docId = (currentDoc as any).id as string;
                  const baseApp = (import.meta.env as any).VITE_STAFF_PORTAL_URL || window.location.origin;
                  const toBase64Url = (s: string) => {
                    const b64 = btoa(s);
                    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
                  };
                  const encodedId = toBase64Url(docId);
                  const startParam = isCollection ? `kbcol_${encodedId}` : `kbdoc_${encodedId}`;
                  const botUsername = import.meta.env.VITE_TG_BOT_USERNAME as string | undefined;
                  const trimmed = String(baseApp).replace(/\/$/, '');
                  const shareUrl = botUsername
                    ? `https://t.me/${botUsername}?startapp=${encodeURIComponent(startParam)}`
                    : `${trimmed}?tgWebAppStartParam=${encodeURIComponent(startParam)}`;

                  const titleText = isCollection
                    ? ('name' in currentDoc ? (currentDoc as any).name : 'Коллекция')
                    : ('title' in currentDoc ? (currentDoc as any).title : 'Документ');

                  const composedText = `${titleText}\n\n${shareUrl}`;
                  if (navigator.share) {
                    await navigator.share({ title: titleText, text: composedText });
                  } else {
                    const tgShare = `https://t.me/share/url?text=${encodeURIComponent(composedText)}`;
                    const waShare = `https://wa.me/?text=${encodeURIComponent(composedText)}`;
                    const win = window.open(tgShare, '_blank');
                    if (!win) {
                      window.open(waShare, '_blank');
                    }
                  }
                } catch (e) {
                  console.error('Share failed', e);
                  toast.error('Не удалось открыть меню «Поделиться»');
                }
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-blue-600"
              style={{ lineHeight: 0 }}
            >
              <ShareExternalIcon size={25} />
            </button>
          )}
        </div>

        {currentDoc && !isCollection && 'updatedAt' in currentDoc && (
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
            <div className="flex items-center space-x-1">
              <Calendar size={16} />
              <span>Обновлено {formatDate((currentDoc as any).updatedAt)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User size={16} />
              <span>{(currentDoc as any).updatedBy?.name}</span>
            </div>
          </div>
        )}
      </div>
      {currentDoc && !isCollection && 'updatedAt' in currentDoc && (
        <>
          {'collection' in currentDoc && (currentDoc as any).collection && (
            <div className="flex items-center space-x-2 mb-4">
              <Badge variant="outline" className="text-sm">
                <BookOpen className="mr-1" size={14} />
                {(currentDoc as any).collection.name}
              </Badge>
              {'pinned' in currentDoc && (currentDoc as any).pinned && (
                <Badge variant="secondary" className="text-sm">
                  Закреплен
                </Badge>
              )}
            </div>
          )}
        </>
      )}

      {/* Content */}
      <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="p-6">
          {isCollection ? (
            ('description' in currentDoc && (currentDoc as any).description) ? (
              <div className="prose max-w-none">
                <MarkdownWithAttachments 
                  content={(currentDoc as any).description} 
                  currentTitle={'name' in currentDoc ? (currentDoc as any).name : undefined}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Описание коллекции отсутствует</div>
            )
          ) : content ? (
            <MarkdownWithAttachments 
              content={normalizedContent} 
              currentTitle={'title' in currentDoc ? (currentDoc as any).title : undefined}
            />
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600">Содержимое документа пусто</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document meta (только серый блок, внизу) */}
      <div className="text-sm text-gray-500 mt-2">
        {'revision' in currentDoc && (currentDoc as any).revision && <span>Версия: {(currentDoc as any).revision}&nbsp;&nbsp;</span>}
        <span>ID: {(currentDoc as any).id}</span><br />
        <span>Создано {formatDate('createdAt' in (currentDoc as any) ? (currentDoc as any).createdAt : new Date().toISOString())}</span>
        {'url' in currentDoc && (currentDoc as any).url && (
          <>
            <br />
            <button
              type="button"
              title="Открыть в Outline (удерживайте для копирования)"
              onPointerDown={handleOpenOutlinePointerDown}
              onPointerUp={handleOpenOutlinePointerUp}
              onPointerLeave={handleOpenOutlinePointerCancel}
              onPointerCancel={handleOpenOutlinePointerCancel}
              className="mt-1 inline-flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-blue-600"
              style={{ lineHeight: 0 }}
            >
              <ExternalLink size={16} />
              <span className="ml-1">Открыть в Outline</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 