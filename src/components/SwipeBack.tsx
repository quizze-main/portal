import { useEffect } from "react";

declare global {
  interface Window {
    __navHistory?: string[];
    __pagePreviews?: Record<string, string>;
  }
}
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Adds custom left-edge swipe gesture (⟵) to go back in history.
 * Useful inside Telegram iOS WebView, where native swipe is disabled.
 */
export const SwipeBack = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ===================== Capture page preview for swipe =====================
  useEffect(() => {
    // Maintain simple path history list
    window.__navHistory = window.__navHistory || [];
    const historyArr = window.__navHistory;
    if (historyArr[historyArr.length - 1] !== location.pathname) {
      historyArr.push(location.pathname);
    }

    // Only capture for iOS to save resources
    const ua = navigator.userAgent || navigator.vendor;
    if (!/iPad|iPhone|iPod/i.test(ua)) return;

    // Delay slightly to ensure page rendered
    const timeoutId = setTimeout(() => {
      const schedule = (cb: () => void) => {
        const ric = (window as any).requestIdleCallback as undefined | ((fn: () => void, opts?: any) => void);
        if (typeof ric === 'function') ric(cb, { timeout: 1000 }); else cb();
      };
      schedule(() => {
        // Dynamically import to avoid heavy bundle upfront
        import('html2canvas').then((mod: any) => {
          const html2canvas = mod.default || mod;
          html2canvas(document.body, {
            backgroundColor: null,
            useCORS: true,
            logging: false,
            scale: 0.6,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
          })
            .then((canvas: HTMLCanvasElement) => {
              window.__pagePreviews = window.__pagePreviews || {};
              // store JPEG with moderate quality to reduce size
              window.__pagePreviews[location.pathname] = canvas.toDataURL('image/jpeg', 0.6);
              // keep only last 6 previews to limit memory
              const keep = (window.__navHistory || []).slice(-6);
              Object.keys(window.__pagePreviews).forEach((k) => {
                if (!keep.includes(k)) delete window.__pagePreviews![k];
              });
            })
            .catch(() => {/* ignore */});
        });
      });
    }, 300); // 300ms after mount

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  // ===================== Android Telegram BackButton handler =====================
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || tg.platform !== 'android') return;

    const updateVisibility = () => {
      if (window.history.length > 1) {
        tg.BackButton.show();
      } else {
        tg.BackButton.hide();
      }
    };

    const onBackClick = () => {
      const idx = (window.history.state?.idx ?? 0);
      if (idx > 0 || window.history.length > 1) {
        navigate(-1);
      } else {
        try { navigate('/', { replace: true }); } catch {}
      }
    };

    tg.BackButton.onClick(onBackClick);
    updateVisibility();

    return () => {
      tg.BackButton.offClick(onBackClick);
      tg.BackButton.hide();
    };
  }, [navigate, location.pathname]);


  // Ref to the element we will translate. We use the React root (#root) so the whole
  // app moves. If later we add a dedicated wrapper, we can switch to it easily.
  const getContainer = () => document.getElementById("root");
  // Detect open Radix dialog content element (modal)
  const getOpenModal = () => document.querySelector<HTMLDivElement>("[data-state='open'][role='dialog']");

  // Safety: remove leftover preview overlay after route change
  useEffect(() => {
    const removeOverlay = () => {
      const el = document.getElementById('swipe-preview-overlay');
      if (el) el.remove();
    };
    requestAnimationFrame(removeOverlay);
  }, [location.pathname]);

  /**
   * Imperative gesture handling because we need Raw touch events outside the React tree
   *   – we cannot rely on React synthetic events for `touchmove` performance.
   */
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor;
    // Target only iOS devices
    if (!/iPad|iPhone|iPod/i.test(ua)) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0; // kept for possible future metrics, but not used in logic
    let isSwiping = false;
    let activeEl: HTMLElement | null = null; // element being dragged (modal or whole app)
    let kbNavEl: HTMLElement | null = null; // sidebar element to temporarily hide
    let previewEl: HTMLElement | null = null; // static preview of previous page
    let keepPreviewOnNavigate = false; // keep overlay visible until route change cleanup

    // Helper to show static preview image of previous page behind the sliding content
    const showPreview = () => {
      const historyArr = (window as any).__navHistory as string[] | undefined;
      const prevPath = historyArr && historyArr.length >= 2 ? historyArr[historyArr.length - 2] : null;
      const dataUrl = prevPath && (window as any).__pagePreviews?.[prevPath];
      previewEl = document.createElement('div');
      previewEl.id = 'swipe-preview-overlay';
      previewEl.style.position = 'fixed';
      previewEl.style.top = '0';
      previewEl.style.left = '0';
      previewEl.style.width = '100vw';
      previewEl.style.height = '100vh';
      previewEl.style.zIndex = '0';
      previewEl.style.pointerEvents = 'none';
      if (dataUrl) {
        previewEl.style.backgroundImage = `url("${dataUrl}")`;
        previewEl.style.backgroundSize = 'cover';
        previewEl.style.backgroundPosition = 'top left';
      } else {
        // Fallback: use current body's background to avoid white flash
        const cs = getComputedStyle(document.body);
        const bg = cs.background || cs.backgroundColor || '#ffffff';
        if (bg) previewEl.style.background = bg;
      }
      document.body.insertBefore(previewEl, document.body.firstChild);
    };

    const hidePreview = () => {
      if (previewEl) {
        previewEl.remove();
        previewEl = null;
      }
    };

    // Best-effort prefetch of the previous page data to avoid blank while going back
    const prefetchPreviousPage = () => {
      try {
        const historyArr = (window as any).__navHistory as string[] | undefined;
        const prevPath = historyArr && historyArr.length >= 2 ? historyArr[historyArr.length - 2] : null;
        if (!prevPath) return;
        // Knowledge document
        const docMatch = prevPath.match(/^\/knowledge\/([^\/]+)$/);
        if (docMatch) {
          const docId = decodeURIComponent(docMatch[1]);
          void Promise.all([
            fetch(`/api/outline/documents/${encodeURIComponent(docId)}`, { credentials: 'include' }).catch(() => void 0),
            fetch(`/api/outline/documents/${encodeURIComponent(docId)}/content`, { credentials: 'include' }).catch(() => void 0),
          ]);
          return;
        }
        // Knowledge root
        if (prevPath === '/knowledge') {
          void Promise.all([
            fetch('/api/outline/documents', { credentials: 'include' }).catch(() => void 0),
            fetch('/api/outline/collections', { credentials: 'include' }).catch(() => void 0),
          ]);
        }
      } catch { /* ignore */ }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return;
      e.preventDefault(); // block vertical scroll while swiping
      const touch = e.touches[0];
      const dx = Math.max(touch.clientX - startX, 0);

      // Only horizontal drag when from the edge.
      if (activeEl) {
        activeEl.style.transform = `translateX(${dx}px)`;
      }
    };

    const resetTransform = (el?: HTMLElement | null) => {
      const target = el ?? getContainer();
      if (target) {
        target.style.transition = "";
        target.style.transform = "";
      }
    };

    // Helper to perform final clean-up of styles after animation completes
    const finishSwipe = (target: HTMLElement | null | undefined) => {
      resetTransform(target);
      if (target) {
        target.style.willChange = "";
      }
      // Restore sidebar visibility if it was hidden
      if (kbNavEl) {
        kbNavEl.style.visibility = "";
        kbNavEl = null;
      }
      document.body.style.overflow = "";
      if (!keepPreviewOnNavigate) hidePreview();
      isSwiping = false;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwiping) return; // Ignore if not a started edge swipe

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);

      if (activeEl) {
        activeEl.style.transition = "transform 300ms ease";
      }

      const modalOpen = Boolean(getOpenModal());
      // Trigger distance: 33% of viewport width for both modal dialogs and full pages
      const threshold = window.innerWidth * 0.33;
      const shouldTrigger = startX < 30 && dx > threshold && dy < 50; // время жеста не ограничиваем

      if (shouldTrigger && activeEl) {
        const handleEnd = () => {
          const modalStillOpen = Boolean(getOpenModal());

          if (modalStillOpen) {
            // Close modal first; its unmount will remove transformed element.
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

            // In rare cases unmount may be asynchronous, so we also reset the
            // transform after the next frame to eliminate visual artefacts.
            requestAnimationFrame(() => finishSwipe(activeEl));
          } else {
            // Regular page navigation back
            // keep preview visible until route-change cleanup to avoid white flash
            keepPreviewOnNavigate = true;
            finishSwipe(activeEl);
            if (window.history.length > 1) {
              navigate(-1);
            }
          }
        };

        // Run handler via transitionend but also add a safety timeout in case the event doesn't fire (e.g. iOS WebView bug).
        let handled = false;
        const handleOnce = () => {
          if (handled) return;
          handled = true;
          handleEnd();
        };
        const timerId = setTimeout(handleOnce, 400);
        activeEl.addEventListener("transitionend", () => {
          clearTimeout(timerId);
          handleOnce();
        }, { once: true });
        activeEl.style.transform = "translateX(100%)";
      } else {
        // Revert back if threshold not met
        if (activeEl) {
          // Ensure we actually animate back so transitionend reliably fires
          activeEl.style.transition = "transform 250ms ease";
          let handled = false;
          const handleOnce = () => {
            if (handled) return;
            handled = true;
            finishSwipe(activeEl);
          };
          const timerId = setTimeout(handleOnce, 350);
          activeEl.addEventListener("transitionend", () => {
            clearTimeout(timerId);
            handleOnce();
          }, { once: true });
          activeEl.style.transform = "translateX(0)";
        } else {
          keepPreviewOnNavigate = false;
          finishSwipe(activeEl);
        }
      }

      // Safety: clear any transform left on the main container **only** when we dragged a modal.
      const containerEl = getContainer();
      if (activeEl && containerEl && activeEl !== containerEl) {
        resetTransform(containerEl);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      // Detect if modal is open
      const modalContent = getOpenModal();

      const modalWrapper = modalContent?.parentElement as HTMLElement | null; // contains overlay + content

      // Block gesture when there's no navigation stack to go back to.
      // We rely on React Router's history state index (idx): 0 on first page load.
      // Disable swipe when idx === 0 so that top-level pages like «Профиль» и «Стандарты»
      // don't show a useless back gesture. We still keep the old length safeguard as fallback.
      const historyIdx = (window.history.state?.idx ?? 0);
      if (historyIdx === 0 || window.history.length <= 1) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();

      // Only begin swipe if the touch originates from the left edge within 30px
      if (startX < 30) {
        showPreview();
        prefetchPreviousPage();
        // If we are on knowledge pages, temporarily hide sidebar so it won't appear during swipe
        if (location.pathname.startsWith('/knowledge')) {
          kbNavEl = document.querySelector('nav[data-kb-nav]') as HTMLElement | null;
          if (kbNavEl) {
            kbNavEl.style.transition = 'none';
            kbNavEl.style.visibility = 'hidden';
          }
        }

        isSwiping = true;
        document.body.style.overflow = "hidden"; // lock vertical scroll

        activeEl = modalContent ? (modalWrapper ?? modalContent) : getContainer();
        if (activeEl) {
          activeEl.style.willChange = "transform";
          activeEl.style.transition = "none"; // Disable transition during follow-along drag
        }
      }
    };

    // Important: touchstart can remain passive because we don't prevent default there
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    // touchmove must be non-passive to allow preventDefault for scroll lock
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    // Ensure cleanup also fires on touchcancel (e.g. OS interruption)
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [navigate, location.pathname]);

  return null;
}; 