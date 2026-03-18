// Yandex Metrika counter IDs
const PROD_COUNTER_ID = 103168261; // portal.loov.ru
const DEV_COUNTER_ID = 103524802;  // dev-portal.loov.ru / localhost

/**
 * Determine which Metrika counter ID should be used for the current build.
 *  - dev-portal.loov.ru и localhost  → DEV_COUNTER_ID
 *  - всё остальное (prod)           → PROD_COUNTER_ID
 */
export function getMetrikaId(): number {
  // During SSR `window` is undefined, fallback to production ID.
  if (typeof window === 'undefined') return PROD_COUNTER_ID;

  const host = window.location.hostname;
  if (host.includes('dev-portal.loov.ru') || host.includes('localhost')) {
    return DEV_COUNTER_ID;
  }
  return PROD_COUNTER_ID;
}

export const YANDEX_METRIKA_ID = getMetrikaId();

/**
 * Safely send user parameters to Yandex Metrika.
 * Example: ymParams({ employee_id: 'HR-EMP-00009' });
 */
export function ymParams(params: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof (window as any).ym === 'function') {
    (window as any).ym(YANDEX_METRIKA_ID, 'params', params);
  }
}

/**
 * Safely send a reachGoal event to Yandex Metrika.
 * Example: ymReachGoal('task_created', { employee_id: 'HR-EMP-00009' });
 */
export function ymReachGoal(goal: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof (window as any).ym === 'function') {
    (window as any).ym(YANDEX_METRIKA_ID, 'reachGoal', goal, params);
  }
}

/**
 * Send a pageview ("hit") to Yandex Metrika using a cleaned URL that excludes hash and query parameters.
 * If `url` is omitted, the current `window.location.origin + window.location.pathname` is used.
 */
export function ymHit(url?: string) {
  if (typeof window !== 'undefined' && typeof (window as any).ym === 'function') {
    const cleanedUrl = url ?? window.location.pathname;
    (window as any).ym(YANDEX_METRIKA_ID, 'hit', cleanedUrl);
  }
}