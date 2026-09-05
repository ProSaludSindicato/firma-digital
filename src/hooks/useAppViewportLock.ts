import { useLayoutEffect } from "react";
import {
  applyAppViewportCssVars,
  measureAppViewport,
  resetDocumentScroll,
} from "@/lib/appViewport";

const IOS_VIEWPORT_SETTLE_MS = 250;

/**
 * Ancla `#root` al visual viewport. Evita el hueco inferior y el header
 * recortado que aparecen en iOS cuando `100dvh` no coincide con el área visible.
 */
export function useAppViewportLock(): void {
  useLayoutEffect(() => {
    let lastHeight = -1;
    let lastOffsetTop = -1;
    let syncing = false;

    const sync = () => {
      if (syncing) {
        return;
      }
      syncing = true;
      try {
        const measured = measureAppViewport(
          window.visualViewport,
          window.innerHeight,
        );
        if (
          measured.height !== lastHeight ||
          measured.offsetTop !== lastOffsetTop
        ) {
          lastHeight = measured.height;
          lastOffsetTop = measured.offsetTop;
          applyAppViewportCssVars(document.documentElement.style, measured);
        }
        resetDocumentScroll(window);
      } finally {
        syncing = false;
      }
    };

    sync();
    const frame = window.requestAnimationFrame(sync);
    const settleTimer = window.setTimeout(sync, IOS_VIEWPORT_SETTLE_MS);

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", sync);
    visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener("pageshow", sync);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      visualViewport?.removeEventListener("resize", sync);
      visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);
}
