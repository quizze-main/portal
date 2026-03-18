import { useState, useEffect } from 'react';

interface ServiceWorkerInfo {
  isSupported: boolean;
  isRegistered: boolean;
  hasUpdate: boolean;
  version: string | null;
  isTelegramWebApp: boolean;
}

export function useServiceWorker() {
  const [swInfo, setSwInfo] = useState<ServiceWorkerInfo>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    hasUpdate: false,
    version: null,
    isTelegramWebApp: !!window.Telegram?.WebApp
  });

  // Регистрация Service Worker
  useEffect(() => {
    if (!swInfo.isSupported) return;

    // В dev-режиме снимаем старый SW и не регистрируем новый
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const r of registrations) {
          r.unregister();
          console.log('🗑️ SW unregistered (dev mode)');
        }
      });
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ SW registered:', registration);
        
        setSwInfo(prev => ({ ...prev, isRegistered: true }));

        // Проверяем обновления
        registration.addEventListener('updatefound', () => {
          const newWorker = registration!.installing;
          console.log('🔄 SW update found');
          
          setSwInfo(prev => ({ ...prev, hasUpdate: true }));

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ SW updated and ready');
              // Автоматически активируем новый SW
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Получаем версию
        getVersion();

      } catch (error) {
        console.error('❌ SW registration failed:', error);
      }
    };

    registerSW();

    // Слушаем сообщения от SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 Message from SW:', event.data);
      
      if (event.data.version) {
        setSwInfo(prev => ({ ...prev, version: event.data.version }));
      }
    });

    // Автоматическое обновление при фокусе (полезно для Telegram)
    const handleFocus = () => {
      if (registration) {
        registration.update();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [swInfo.isSupported]);

  // Получить версию SW
  const getVersion = async () => {
    if (!navigator.serviceWorker.controller) return;

    const messageChannel = new MessageChannel();
    
    return new Promise<string>((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        const version = event.data.version;
        setSwInfo(prev => ({ ...prev, version }));
        resolve(version);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  };

  // Очистить кэш
  const clearCache = async (): Promise<boolean> => {
    if (!navigator.serviceWorker.controller) {
      console.warn('No SW controller available');
      return false;
    }

    const messageChannel = new MessageChannel();
    
    return new Promise<boolean>((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        console.log('🗑️ Cache cleared:', event.data);
        resolve(event.data.success === true);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  };

  // Принудительное обновление приложения
  const forceUpdate = async () => {
    try {
      // Сначала очищаем кэш
      await clearCache();
      
      // Затем перезагружаем страницу
      window.location.reload();
    } catch (error) {
      console.error('Failed to force update:', error);
    }
  };

  // Автоматическая очистка кэша каждые 5 минут в Telegram
  useEffect(() => {
    if (!swInfo.isTelegramWebApp) return;

    const interval = setInterval(async () => {
      console.log('🔄 Auto cache refresh for Telegram');
      
      // Обновляем SW
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.update();
        }
      }
    }, 5 * 60 * 1000); // 5 минут

    return () => clearInterval(interval);
  }, [swInfo.isTelegramWebApp]);

  return {
    ...swInfo,
    getVersion,
    clearCache,
    forceUpdate
  };
} 