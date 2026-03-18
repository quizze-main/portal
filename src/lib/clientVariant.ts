import type { UserSettingsVariant } from '@/lib/internalApiClient';

/**
 * Detects current client variant for user-settings scoping.
 *
 * IMPORTANT: For Telegram Desktop mini-app, window width can be small (side panel),
 * so we must not rely on viewport width alone. Use Telegram WebApp platform when available.
 */
export function detectClientVariant(): UserSettingsVariant {
  const tg = (typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined) as any;
  const isTg = Boolean(tg);
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? String(navigator.userAgent) : '';

  if (isTg) {
    const platformRaw = tg?.platform != null ? String(tg.platform).toLowerCase() : '';
    // Telegram WebApp platform reference typically includes:
    // ios/android/tdesktop/macos/weba/webk (and possibly others).
    if (platformRaw === 'tdesktop' || platformRaw === 'macos') return 'desktop_tg';
    if (platformRaw === 'ios' || platformRaw === 'android') return 'mobile_tg';

    // Fallbacks:
    // 1) Telegram Desktop UA (sometimes present)
    if (/TelegramDesktop/i.test(ua)) return 'desktop_tg';
    // 2) Size heuristic as a last resort (webview might not expose platform reliably)
    try {
      if (typeof window !== 'undefined' && window.innerWidth >= 900) return 'desktop_tg';
    } catch {}
    return 'mobile_tg';
  }

  // Web (non-Telegram)
  try {
    const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches;
    if (coarse) return 'mobile_web';
  } catch {}
  try {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'mobile_web';
  } catch {}
  return 'desktop_web';
}

