// Динамическая версия кэша на основе времени сборки
const CACHE_VERSION = '__BUILD_TIME__'; // Будет заменено при сборке

// Dev-режим: __BUILD_TIME__ не заменён — SW становится no-op, чистит старые кэши
const IS_DEV = CACHE_VERSION === '__BUILD_' + 'TIME__';

if (IS_DEV) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then(names =>
        Promise.all(names.filter(n => n.startsWith('staff-focus-')).map(n => caches.delete(n)))
      ).then(() => self.clients.claim())
    );
  });
  // Без fetch-обработчика — все запросы идут в сеть напрямую
}

if (!IS_DEV) {

const CACHE_NAME = `staff-focus-${CACHE_VERSION}`;
const HTML_CACHE = `staff-focus-html-${CACHE_VERSION}`;
const ASSETS_CACHE = `staff-focus-assets-${CACHE_VERSION}`;

// Максимальное время жизни кэша HTML (в миллисекундах)
const HTML_MAX_AGE = 5 * 60 * 1000; // 5 минут
const ASSETS_MAX_AGE = 24 * 60 * 60 * 1000; // 24 часа

// Проверка Telegram Web App
const isTelegramWebApp = self.location.search.includes('tgWebAppPlatform') ||
                        self.location.search.includes('tgWebAppVersion');

console.log('🔧 Service Worker starting:', {
  version: CACHE_VERSION,
  isTelegram: isTelegramWebApp,
  caches: [CACHE_NAME, HTML_CACHE, ASSETS_CACHE]
});

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 SW Installing, version:', CACHE_VERSION);
  self.skipWaiting(); // Немедленно активируем новый SW

  event.waitUntil(
    Promise.all([
      // Предварительно кэшируем только критические ресурсы
      caches.open(ASSETS_CACHE).then(cache => {
        return cache.addAll([
          '/manifest.json',
          '/favicon.ico',
          '/icon-192.png',
          '/icon-512.png'
        ]).catch(error => {
          console.warn('Failed to cache some assets:', error);
        });
      })
    ])
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ SW Activating, version:', CACHE_VERSION);

  event.waitUntil(
    Promise.all([
      // Удаляем старые кэши
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('staff-focus-') &&
                !cacheName.includes(CACHE_VERSION)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Берем контроль над всеми клиентами
      self.clients.claim()
    ])
  );
});

// Проверка свежести кэша
function isCacheStale(timestamp, maxAge) {
  return !timestamp || (Date.now() - timestamp) > maxAge;
}

// Сохранение с временной меткой
function cacheWithTimestamp(cache, request, response) {
  const responseClone = response.clone();
  const meta = {
    timestamp: Date.now(),
    url: request.url
  };
  
  // Сохраняем ответ и метаданные
  return Promise.all([
    cache.put(request, responseClone),
    cache.put(`${request.url}:meta`, new Response(JSON.stringify(meta)))
  ]);
}

// Получение с проверкой временной метки
async function getCachedWithTimestamp(cache, request, maxAge) {
  try {
    const [cachedResponse, metaResponse] = await Promise.all([
      cache.match(request),
      cache.match(`${request.url}:meta`)
    ]);
    
    if (!cachedResponse || !metaResponse) {
      return null;
    }
    
    const meta = await metaResponse.json();
    
    if (isCacheStale(meta.timestamp, maxAge)) {
      console.log('⏰ Cache expired for:', request.url);
      return null;
    }
    
    console.log('💾 Cache hit for:', request.url);
    return cachedResponse;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

// Основная логика fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем non-GET запросы, внешние ресурсы и API-запросы
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin) || url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Стратегия для HTML файлов (включая корень)
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(handleHTMLRequest(request));
    return;
  }
  
  // Стратегия для статических ресурсов
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(handleAssetRequest(request));
    return;
  }
  
  // Для всех остальных запросов - сеть с fallback на кэш
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Обработка HTML запросов - всегда сначала сеть
async function handleHTMLRequest(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    console.log('🌐 Fetching HTML from network:', request.url);
    const response = await fetch(request);
    if (response.ok) {
      // Кэшируем новую версию
      await cacheWithTimestamp(cache, request, response);
      console.log('💾 HTML cached:', request.url);
      return response;
    }
    throw new Error(`Network response not ok: ${response.status}`);
  } catch (error) {
    console.warn('🚨 Network failed for HTML, trying cache:', error.message);
    // Пытаемся загрузить из кэша
    const cachedResponse = await getCachedWithTimestamp(cache, request, HTML_MAX_AGE);
    if (cachedResponse) {
      console.log('💾 Serving stale HTML from cache');
      return cachedResponse;
    }
    // Если в кэше нет или устарел, пытаемся любой кэш
    const anyCached = await cache.match(request);
    if (anyCached) {
      console.log('💾 Serving very stale HTML from cache');
      return anyCached;
    }
    // Вместо throw error:
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Обработка статических ресурсов - кэш сначала
async function handleAssetRequest(request) {
  const cache = await caches.open(ASSETS_CACHE);
  // Сначала проверяем кэш
  const cachedResponse = await getCachedWithTimestamp(cache, request, ASSETS_MAX_AGE);
  if (cachedResponse) {
    return cachedResponse;
  }
  // Если в кэше нет или устарел, загружаем из сети
  try {
    console.log('🌐 Fetching asset from network:', request.url);
    const response = await fetch(request);
    if (response.ok) {
      await cacheWithTimestamp(cache, request, response);
      console.log('💾 Asset cached:', request.url);
    }
    return response;
  } catch (error) {
    console.warn('🚨 Network failed for asset:', error.message);
    // В крайнем случае отдаем любую версию из кэша
    const anyCached = await cache.match(request);
    if (anyCached) {
      console.log('💾 Serving stale asset from cache');
      return anyCached;
    }
    // Вместо throw error:
    return new Response('Asset not available', { status: 503, statusText: 'Offline' });
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('📨 SW received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('staff-focus-')) {
              console.log('🗑️ Clearing cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// Специальная логика для Telegram
if (isTelegramWebApp) {
  console.log('📱 Telegram Web App detected - using aggressive cache update strategy');

  // В Telegram более агрессивно обновляем HTML
  self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('staff-focus.localhost') &&
        event.request.url.includes('?')) {
      // Форсируем обновление при переходах в Telegram
      event.respondWith(
        fetch(event.request.url.split('?')[0])
          .catch(() => caches.match(event.request))
      );
    }
  });
}

} // end if (!IS_DEV) 