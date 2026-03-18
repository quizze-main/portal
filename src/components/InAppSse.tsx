import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { useEmployee } from '@/contexts/EmployeeProvider';

declare global {
  interface Window { __sfeSseActive?: boolean }
}

export const InAppSse = () => {
  const { employee } = useEmployee();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const isTelegramWebView = !!window.Telegram?.WebApp;
    if (!isTelegramWebView) return;
    if (!employee) return; // дождаться аутентификации
    if (window.__sfeSseActive) return; // уже подключены

    try {
      const es = new EventSource('/api/events/stream', { withCredentials: true } as any);
      esRef.current = es;
      window.__sfeSseActive = true;

      es.addEventListener('hello', () => console.log('📡 SSE connected for', employee?.name));
      es.addEventListener('ping', () => {});
      es.addEventListener('tg-notification', (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data || '{}');
          const text: string = payload?.text || '';
          if (!text) return;
          // Убираем ссылку из тоста внутри приложения: показываем только чистый текст
          toast(text.replace(/https?:\/\/\S+/g, ''), {
            action: undefined
          });
        } catch (e) {
          console.warn('Failed to parse SSE tg-notification', e);
        }
      });
      es.onerror = () => {
        // Браузер переподключится сам; оставляем тихо
      };

      return () => {
        try { es.close(); } catch {}
        esRef.current = null;
        window.__sfeSseActive = false;
      };
    } catch (e) {
      console.warn('SSE init failed', e);
    }
  }, [employee?.name]);

  return null;
};


