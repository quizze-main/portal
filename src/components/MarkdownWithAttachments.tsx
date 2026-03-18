import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { AttachmentViewer } from './AttachmentViewer';
import { ImageLoader } from './ImageLoader';
import { FullScreenTableModal } from './FullScreenTableModal';

interface MarkdownWithAttachmentsProps {
  content: string;
  /**
   * Заголовок текущего документа (или коллекции), из которого совершается переход.
   * Передается, чтобы при открытии целевой статьи можно было показать его в кнопке «назад».
   */
  currentTitle?: string;
}

export const MarkdownWithAttachments = ({ content, currentTitle }: MarkdownWithAttachmentsProps) => {
  // sanitize Outline wiki markers '==Heading==' to just Heading
  const sanitized = useMemo(() => {
    let out = content.replace(/==+\s*(.*?)\s*==+/g, '$1');

    // Удаляем первый заголовок уровня 1 (# Heading или <h1>) в начале контента, чтобы избежать дублирования с заголовком страницы
    // Markdown формат «# Заголовок»
    out = out.replace(/^\s*#\s+.*?(\n|$)/, '');
    // HTML тег <h1>...</h1>
    out = out.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
    // Заменяем символ "@" непосредственно перед "[" – превращая @[link](..) в обычный markdown ссылку
    out = out.replace(/@(?=\[)/g, '');

    // Конвертируем ссылки вида (mention://.../document/<uuid>) → (/document/<uuid>)
    out = out.replace(/\]\(mention:\/\/[^)]+\/document\/([a-zA-Z0-9\-]{8,})\)/g, '](\/document/$1)');

    // convert :::info / :::success / etc. blocks → blockquote с эмоджи
    const emojiMap: Record<string, string> = {
      info: 'ℹ️',
      note: '📝',
      warning: '⚠️',
      tip: '💡',
      danger: '❗',
      error: '❗',
      success: '✅',
    };

    out = out.replace(/:::\s*(info|note|warning|tip|danger|success|error)([^\n]*)\n([\s\S]*?)\n:::/g, (_, type, titleLine, body) => {
      const emoji = emojiMap[type] || '';
      const contentLinesRaw = (titleLine + "\n" + body).trim();
      const lines = contentLinesRaw.split(/\n/);
      if (lines.length > 0) {
        lines[0] = `${emoji} ${lines[0].trim()}`.trim();
      }
      const quoted = lines.map((l: string) => `> ${l}`).join('\n');
      return quoted;
    });

    // Удаляем строки, состоящие только из обратного слеша (используется Outline для переноса строк)
    out = out.replace(/^\s*\\\s*$/gm, '');
    return out;
  }, [content]);

  const [expandedTableContent, setExpandedTableContent] = useState<React.ReactNode | null>(null);

  // Извлекаем только НЕ-изображения вложения из markdown (для ссылок)
  const extractAttachments = (content: string): Array<{ id: string; name: string; originalText: string }> => {
    const attachments: Array<{ id: string; name: string; originalText: string }> = [];
    
    // Сначала найдем все ссылки с attachments
    const allLinksRegex = /\[([^\]]+)\]\(\/api\/(?:outline\/)?attachments\.redirect\?id=([^)]+)\)/g;
    let match;
    
    while ((match = allLinksRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const linkText = match[1];
      const originalId = match[2];
      
      // Проверяем, не является ли это изображением (изображения начинаются с !)
      const beforeMatch = content.substring(0, match.index);
      const isImage = beforeMatch.endsWith('!');
      
      // Пропускаем изображения - они обрабатываются отдельно
      if (!isImage) {
        // Очищаем ID от параметров размера и лишних символов
        let cleanId = originalId;
        cleanId = cleanId.replace(/\s*["'%]\s*=\d+x\d+.*$/, '');
        cleanId = cleanId.replace(/\s*=\d+x\d+.*$/, '');
        cleanId = cleanId.replace(/["'%]*$/, '');
        
        attachments.push({
          name: linkText,
          id: cleanId,
          originalText: fullMatch
        });
      }
    }
    return attachments;
  };

  // Просто извлекаем вложения для показа в секции внизу, но не трогаем контент
  const attachments = useMemo(() => {
    return extractAttachments(sanitized);
  }, [sanitized]);

  type OutlineLinkInfo =
    | { type: 'doc'; id: string; hash?: string }
    | { type: 'collection'; id: string }
    | { type: 'other' };

  const parseOutlineHref = (href: string | undefined): OutlineLinkInfo => {
    if (!href) return { type: 'other' };

    try {
      const outlineBase = (import.meta.env.VITE_OUTLINE_BASE_URL || '').replace(/\/$/, '');
      const url = new URL(
        href,
        // если абсолютная ссылка — URL сам разберет; если относительная — используем фиктивный базовый домен
        'https://dummy.local'
      );
      const { pathname, hash, host, search } = url;

      // Если ссылка с хоста Outline — трактуем её как внутреннюю и анализируем только путь
      const isOutlineHost = outlineBase && (() => {
        try {
          const ob = new URL(outlineBase);
          return ob.host === host;
        } catch { return false; }
      })();

      const pathToParse = pathname;

      /** DOCUMENT LINKS */
      // Форматы: /doc/<slug>-<id>, /doc/<id>, возможно с хешем якоря
      const dashMatch = pathToParse.match(/\/doc\/[^/]+-([a-zA-Z0-9\-]{8,})/);
      if (dashMatch) {
        return { type: 'doc', id: dashMatch[1], hash: hash ? hash.substring(1) : undefined };
      }
      const directMatch = pathToParse.match(/\/doc\/([a-zA-Z0-9\-]{8,})/);
      if (directMatch) {
        return { type: 'doc', id: directMatch[1], hash: hash ? hash.substring(1) : undefined };
      }

      // Доп. форматы в рамках коллекции:
      // /collection/<uuid>/doc/<slug>-<id>
      const collectionDocMatch1 = pathToParse.match(/\/collection\/[a-zA-Z0-9\-]{8,}\/doc\/[^/]+-([a-zA-Z0-9\-]{8,})/);
      if (collectionDocMatch1) {
        return { type: 'doc', id: collectionDocMatch1[1], hash: hash ? hash.substring(1) : undefined };
      }
      // /collection/<uuid>/<slug>-<id>
      const collectionDocMatch2 = pathToParse.match(/\/collection\/[a-zA-Z0-9\-]{8,}\/[^/]+-([a-zA-Z0-9\-]{8,})/);
      if (collectionDocMatch2) {
        return { type: 'doc', id: collectionDocMatch2[1], hash: hash ? hash.substring(1) : undefined };
      }

      // Короткий формат: /d/<id>
      const shortDocMatch = pathToParse.match(/\/d\/([a-zA-Z0-9\-]{8,})/);
      if (shortDocMatch) {
        return { type: 'doc', id: shortDocMatch[1], hash: hash ? hash.substring(1) : undefined };
      }

      // Возможные редиректы: /r/<id> (иногда используется Outline)
      const redirectDocMatch = pathToParse.match(/\/r\/([a-zA-Z0-9\-]{8,})/);
      if (redirectDocMatch) {
        return { type: 'doc', id: redirectDocMatch[1], hash: hash ? hash.substring(1) : undefined };
      }

      // Фолбэк: любая ссылка, содержащая '/doc/' и суффикс '-<id>' → считаем документом
      const looseDoc = pathToParse.match(/\/doc\/[^#?]+?-([a-zA-Z0-9\-]{8,})(?:$|[?#\/])/);
      if (looseDoc) {
        return { type: 'doc', id: looseDoc[1], hash: hash ? hash.substring(1) : undefined };
      }

      // Попытка вытащить documentId из query string если присутствует
      if (search) {
        const params = new URLSearchParams(search);
        const qDoc = params.get('documentId') || params.get('docId') || params.get('id');
        if (qDoc && /^[a-zA-Z0-9\-]{8,}$/.test(qDoc)) {
          return { type: 'doc', id: qDoc, hash: hash ? hash.substring(1) : undefined };
        }
        const qCollection = params.get('collectionId') || params.get('collection');
        if (qCollection && /^[a-zA-Z0-9\-]{8,}$/.test(qCollection)) {
          return { type: 'collection', id: qCollection };
        }
      }

      /** COLLECTION LINKS */
      // Формат: /collection/<uuid> (uuid может содержать буквы, цифры, тире)
      const collectionMatch = pathToParse.match(/\/collection\/([a-zA-Z0-9\-]{8,})/);
      if (collectionMatch) {
        return { type: 'collection', id: collectionMatch[1] };
      }

      /** MENTION LINKS */
      // Формат: mention://<collectionId>/document/<uuid>
      const mentionDocMatch = pathToParse.match(/\/document\/([a-zA-Z0-9\-]{8,})/);
      if (mentionDocMatch) {
        return { type: 'doc', id: mentionDocMatch[1], hash: hash ? hash.substring(1) : undefined };
      }

      // Если это был хост Outline, но по паттернам не распознали — оставляем внешней ссылкой
      return { type: 'other' };
    } catch {
      return { type: 'other' };
    }
  };

  // Добавляю функцию, которая преобразует ссылки на видео-сервисы в URL для embed <iframe>
  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    // Try to parse URL to safely read search/hash
    let parsed: URL | null = null;
    try { parsed = new URL(url); } catch { try { parsed = new URL(url, 'https://dummy.local'); } catch { parsed = null; } }
    // Loom share links → https://www.loom.com/embed/<id>
    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      return `https://www.loom.com/embed/${loomMatch[1]}`;
    }

    // Google Drive file links → https://drive.google.com/file/d/<id>/preview
    const driveMatch =
      url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    // Google Docs editors (Docs/Sheets/Slides/Forms)
    // Sheets
    const sheets = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheets) {
      const gidMatch = (parsed && (parsed.hash.match(/gid=(\d+)/) || parsed.search.match(/gid=(\d+)/))) || null;
      const gid = gidMatch ? gidMatch[1] : null;
      return `https://docs.google.com/spreadsheets/d/${sheets[1]}/preview${gid ? `#gid=${gid}` : ''}`;
    }
    // Docs
    const gdoc = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (gdoc) {
      return `https://docs.google.com/document/d/${gdoc[1]}/preview`;
    }
    // Slides
    const gslides = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (gslides) {
      return `https://docs.google.com/presentation/d/${gslides[1]}/embed?start=false&loop=false&delayms=3000`;
    }
    // Forms
    const gform = url.match(/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
    if (gform) {
      return `https://docs.google.com/forms/d/e/${gform[1]}/viewform?embedded=true`;
    }

    // Miro boards
    try {
      if (parsed && /miro\.com$/.test(parsed.host) && /\/app\/board\//.test(parsed.pathname)) {
        const boardIdMatch = parsed.pathname.match(/\/app\/board\/([^/]+)/);
        const boardId = boardIdMatch ? boardIdMatch[1] : null;
        if (boardId) {
          return `https://miro.com/app/live-embed/${boardId}/${parsed.search || ''}`;
        }
      }
    } catch { /* ignore */ }

    // YouTube → watch or short
    const ytWatch = url.match(/youtube\.com\/(?:watch\?v=|embed\/)([a-zA-Z0-9_-]{6,})/);
    if (ytWatch) {
      return `https://www.youtube.com/embed/${ytWatch[1]}?rel=0`;
    }
    const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (ytShort) {
      return `https://www.youtube.com/embed/${ytShort[1]}?rel=0`;
    }

    // Vimeo
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeo) {
      return `https://player.vimeo.com/video/${vimeo[1]}`;
    }

    return null;
  };

  // Возвращает исходную ссылку для открытия в новой вкладке по embed-URL
  const getOriginalUrlFromEmbed = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
      // Google Sheets preview → edit/view with gid
      const sheetsPrev = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/preview(?:#gid=(\d+))?/);
      if (sheetsPrev) {
        return `https://docs.google.com/spreadsheets/d/${sheetsPrev[1]}/edit${sheetsPrev[2] ? `#gid=${sheetsPrev[2]}` : ''}`;
      }
      // Google Docs preview → view
      const docPrev = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)\/preview/);
      if (docPrev) {
        return `https://docs.google.com/document/d/${docPrev[1]}/view`;
      }
      // Google Slides embed → view
      const slidesEmbed = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)\/embed/);
      if (slidesEmbed) {
        return `https://docs.google.com/presentation/d/${slidesEmbed[1]}/view`;
      }
      // Google Forms embedded → viewform
      const formsEmbed = url.match(/docs\.google\.com\/forms\/d\/e\/([a-zA-Z0-9_-]+)\/viewform/);
      if (formsEmbed) {
        return `https://docs.google.com/forms/d/e/${formsEmbed[1]}/viewform`;
      }
      // Google Drive preview → view
      const drivePreview = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/preview/);
      if (drivePreview) {
        return `https://drive.google.com/file/d/${drivePreview[1]}/view`;
      }
      // YouTube embed → watch
      const ytEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
      if (ytEmbed) {
        return `https://www.youtube.com/watch?v=${ytEmbed[1]}`;
      }
      // Loom embed → share
      const loom = url.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
      if (loom) {
        return `https://www.loom.com/share/${loom[1]}`;
      }
      // Vimeo embed → video page
      const vimeo = url.match(/player\.vimeo\.com\/video\/([0-9]+)/);
      if (vimeo) {
        return `https://vimeo.com/${vimeo[1]}`;
      }
      // Miro live-embed → board
      const miro = url.match(/miro\.com\/app\/live-embed\/([^/]+)\//);
      if (miro) {
        // Preserve query if present
        const qIndex = url.indexOf('?');
        const qs = qIndex >= 0 ? url.substring(qIndex) : '';
        return `https://miro.com/app/board/${miro[1]}/${qs}`;
      }
      // По умолчанию возвращаем сам url
      return url;
    } catch {
      return url;
    }
  };

  // ---------- Responsive table wrapper ----------
  /**
   * Оборачивает таблицу в горизонтально прокручиваемую область.
   * Сохраняет стили заголовков, сетки и отступов, добавляя при этом
   * небольшую тень и скругление, чтобы таблица не казалась «прижатой».
   */
  const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="table-scroll-wrapper overflow-auto my-4 relative">
      <button
        type="button"
        aria-label="Развернуть таблицу"
        onClick={() => setExpandedTableContent(children)}
        className="absolute right-2 top-2 p-1 rounded-md bg-white/80 hover:bg-white shadow border border-gray-300 text-gray-600 text-xs"
      >
        ⤢
      </button>
      <table className="border-collapse rounded-lg shadow-sm">{children}</table>
    </div>
  );
   
  // Кастомные компоненты для ReactMarkdown
  const components = {
    // Переопределяем параграфы: если внутри есть изображение/встраиваемый блок — заменяем <p> на <div>
    p: ({ node, children, ...props }: any) => {
      const hasBlockyChild = Array.isArray(node?.children) && node.children.some((child: any) => {
        const t = child?.type || child?.tagName;
        return t === 'image' || t === 'html' || t === 'link' || t === 'iframe';
      });
      if (hasBlockyChild) {
        return <div {...props}>{children}</div>;
      }
      return <p {...props}>{children}</p>;
    },
    // Обработчик изображений
    img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
      if (!src) return null;
      
      // Проверяем, является ли это изображением из Outline
      const outlineImageRegex = /\/api\/(?:outline\/)?attachments\.redirect\?id=([^&]+)/;
      const match = src.match(outlineImageRegex);
      
      if (match) {
        // Извлекаем ID вложения
        let attachmentId = match[1];
        
        // Очищаем ID от параметров размера и лишних символов
        attachmentId = attachmentId.replace(/\s*["'%]\s*=\d+x\d+.*$/, '');
        attachmentId = attachmentId.replace(/\s*=\d+x\d+.*$/, '');
        attachmentId = attachmentId.replace(/["'%]*$/, '');
        
        // Используем наш ImageLoader для загрузки изображения с подписью из alt
        return (
          <div className="my-6">
            <ImageLoader
              attachmentId={attachmentId}
              alt={alt}
              caption={alt}
              className="max-w-full"
            />
          </div>
        );
      }
      
      // Для обычных изображений используем стандартный тег
      return <img src={src} alt={alt} {...props} className="max-w-full rounded-lg" />;
    },

    // Обработчик встроенных iframe из сырого HTML (rehypeRaw включен)
    iframe: ({ src, allow, title, style, ...props }: React.IframeHTMLAttributes<HTMLIFrameElement>) => {
      if (!src) return null;
      const allowAttr = allow || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      const frameRef = useRef<HTMLIFrameElement | null>(null);
      const containerRef = useRef<HTMLDivElement | null>(null);

      const enterFullscreen = () => {
        // Try iframe first, then container
        const el: any = frameRef.current || containerRef.current;
        if (!el) return;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (typeof req === 'function') {
          req.call(el);
        }
      };
      const isMiro = /miro\.com\/app\/live-embed\//.test(src);
      return (
        <div className="my-4" ref={containerRef}>
          <div className={`embed-video-wrapper ${isMiro ? 'miro-embed' : ''}`}>
            <button
              type="button"
              aria-label="Полноэкранный режим"
              onClick={enterFullscreen}
              className="embed-fs-btn absolute right-2 top-2 p-1 rounded-md bg-white/80 hover:bg-white shadow border border-gray-300 text-gray-600 text-xs z-10"
            >
              ⤢
            </button>
            {isMiro && (
              <>
                <div className="embed-overlay overlay-top" />
                <div className="embed-overlay overlay-left" />
              </>
            )}
            <iframe
              src={src}
              allow={allowAttr}
              allowFullScreen
              // vendor-prefixed attrs for wider webview/browser support
              {...({ webkitallowfullscreen: true, mozallowfullscreen: true } as any)}
              frameBorder={0}
              title={title || 'Embedded content'}
              style={{ pointerEvents: 'auto', zIndex: 1, ...(style || {}) }}
              ref={frameRef}
              {...props}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Если видите экран входа или ошибка доступа —
            {' '}<a
              href={getOriginalUrlFromEmbed(src) || src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              открыть оригинал
            </a>
            .
          </div>
        </div>
      );
    },

    // Обработчик HTML5 video тегов
    video: ({ src, controls, children, style, ...props }: React.VideoHTMLAttributes<HTMLVideoElement>) => {
      const videoRef = useRef<HTMLVideoElement | null>(null);
      const containerRef = useRef<HTMLDivElement | null>(null);
      // Всегда включаем стандартные контролы, чтобы работали полноэкранный режим и скорость воспроизведения
      const videoProps: React.VideoHTMLAttributes<HTMLVideoElement> = {
        ...props,
        src,
        controls: true,
        playsInline: true,
        style: { width: '100%', maxWidth: '100%', ...(style || {}) },
      };
      return (
        <div className="my-4 relative" ref={containerRef}>
          <video ref={videoRef} {...videoProps}>{children}</video>
        </div>
      );
    },
    
    // Обработчик для HTML figure элементов
    figure: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      return (
        <figure className="my-4 text-center" {...props}>
          {children}
        </figure>
      );
    },
    
    // Обработчик для HTML figcaption элементов
    figcaption: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      return (
        <figcaption className="mt-2 text-sm text-gray-600 italic text-center" {...props}>
          {children}
        </figcaption>
      );
    },
    
    // Обработчик ссылок
    a: ({ href, children, node, position, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: any; position?: any }) => {
      // Сначала проверяем, можно ли отобразить видео-плеер по этой ссылке
      const embedUrl = getEmbedUrl(href || "");
      if (embedUrl) {
        const isMiro = /miro\.com\/app\/live-embed\//.test(embedUrl);
        const frameRef = useRef<HTMLIFrameElement | null>(null);
        const containerRef = useRef<HTMLDivElement | null>(null);
        const enterFullscreen = () => {
          const el: any = frameRef.current || containerRef.current;
          if (!el) return;
          const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
          if (typeof req === 'function') req.call(el);
        };
        return (
          <div className="my-4" ref={containerRef}>
            <div className={`embed-video-wrapper ${isMiro ? 'miro-embed' : ''}`}>
              <button
                type="button"
                aria-label="Полноэкранный режим"
                onClick={enterFullscreen}
                className="embed-fs-btn absolute right-2 top-2 p-1 rounded-md bg-white/80 hover:bg-white shadow border border-gray-300 text-gray-600 text-xs z-10"
              >
                ⤢
              </button>
              {isMiro && (
                <>
                  <div className="embed-overlay overlay-top" />
                  <div className="embed-overlay overlay-left" />
                </>
              )}
              <iframe
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                // vendor-prefixed attrs for wider webview/browser support
                webkitallowfullscreen
                mozallowfullscreen
                frameBorder="0"
                title="Embedded video"
                ref={frameRef}
                />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Если контент не отображается —
              {' '}<a
                href={href || getOriginalUrlFromEmbed(embedUrl) || embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                открыть оригинал
              </a>
              .
            </div>
          </div>
        );
      }

      // Если ссылка ведет на видео-файл (mp4/webm/ogg) или на редирект вложения — рендерим встроенный видео-плеер
      if (href && (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(href) || /\/api\/(?:outline\/)?attachments\.redirect/i.test(href))) {
        return (
          <div className="my-4">
            <video
              src={href}
              controls
              playsInline
              style={{ width: '100%', maxWidth: '100%' }}
            />
          </div>
        );
      }

      const info = parseOutlineHref(href);

      // Исключаем невалидные атрибуты, а также target/rel для внутренних переходов
      const { target: _t, rel: _r, ...cleanRest } = rest;

      if (info.type === 'doc') {
        const path = `/knowledge/${encodeURIComponent(info.id)}`;
        return (
          <Link
            to={path}
            {...(currentTitle ? { state: { fromTitle: currentTitle, fromArticle: true } } : { state: { fromArticle: true } })}
            {...cleanRest}
            className="text-blue-600 hover:underline"
          >
            {children}
          </Link>
        );
      }

      if (info.type === 'collection') {
        const path = `/knowledge/collection/${encodeURIComponent(info.id)}`;
        return (
          <Link
            to={path}
            {...(currentTitle ? { state: { fromTitle: currentTitle, fromArticle: true } } : { state: { fromArticle: true } })}
            {...cleanRest}
            className="text-blue-600 hover:underline"
          >
            {children}
          </Link>
        );
      }

      // Ссылка без href — просто текст (чтобы не было пустых ссылок с target)
      if (!href) {
        return <span {...cleanRest}>{children}</span>;
      }

      // Прочие ссылки — внешние: открываем в новой вкладке
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...cleanRest} className="text-blue-600 hover:underline">
          {children}
        </a>
      );
    },

    // Обработчик для упорядоченных списков (сохраняет нумерацию)
    ol: ({ children, start, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal list-outside space-y-1 my-4 pl-6 text-gray-900" start={start} {...props}>{children}</ol>
    ),
    
    // Обработчик для жирного текста
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      return (
        <strong className="font-semibold" {...props}>
          {children}
        </strong>
      );
    },

    // Обработчик для таблиц
    table: ({ children }: { children: React.ReactNode }) => {
      return <TableWrapper>{children}</TableWrapper>;
    }
  };

  return (
    <div className="markdown-content">
      <div className="max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
          skipHtml={false}
        >
          {sanitized}
        </ReactMarkdown>
      </div>
      
      {/* Отображаем только НЕ-изображения вложения после markdown */}
      {attachments.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Вложения</h3>
          <p className="text-sm text-gray-600">
            Файлы для скачивания (изображения показаны выше в тексте)
          </p>
          {attachments.map((attachment) => (
            <AttachmentViewer 
              key={attachment.id} 
              attachmentId={attachment.id} 
              fileName={attachment.name} 
            />
          ))}
        </div>
      )}
      {/* Fullscreen table modal */}
      <FullScreenTableModal
        open={expandedTableContent !== null}
        onOpenChange={(open) => !open && setExpandedTableContent(null)}
      >
        <div className="table-scroll-wrapper">
          <table className="border-collapse rounded-lg shadow-sm w-full">
            {expandedTableContent}
          </table>
        </div>
      </FullScreenTableModal>
    </div>
  );
}; 