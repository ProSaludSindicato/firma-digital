export type AppViewportSize = {
  height: number;
  offsetTop: number;
};

type VisualViewportLike =
  | (Pick<VisualViewport, "height" | "offsetTop"> & Partial<Pick<VisualViewport, "scale">>)
  | null
  | undefined;

const PINCH_ZOOM_SCALE_THRESHOLD = 1.01;

/**
 * El pinch-zoom nativo reduce `visualViewport.height` sin cambiar el layout.
 * Actualizar `--app-height` en ese estado comprime header/footer y provoca jitter.
 */
export function isPinchZoomed(viewport: VisualViewportLike): boolean {
  return (viewport?.scale ?? 1) > PINCH_ZOOM_SCALE_THRESHOLD;
}

/**
 * Mide el área realmente visible. En iOS Safari, `100dvh` / `window.innerHeight`
 * a menudo quedan desfasados respecto a la barra de herramientas y el visual
 * viewport, lo que deja un hueco bajo el footer o esconde el header.
 */
export function measureAppViewport(
  viewport: VisualViewportLike,
  fallbackHeight: number,
): AppViewportSize {
  const rawHeight = viewport?.height ?? fallbackHeight;
  const rawOffsetTop = viewport?.offsetTop ?? 0;
  return {
    height: Math.max(1, Math.round(rawHeight)),
    offsetTop: Math.max(0, Math.round(rawOffsetTop)),
  };
}

export function applyAppViewportCssVars(
  style: CSSStyleDeclaration,
  viewport: AppViewportSize,
): void {
  style.setProperty("--app-height", `${viewport.height}px`);
  style.setProperty("--app-offset-top", `${viewport.offsetTop}px`);
}

export function resetDocumentScroll(target: {
  scrollX: number;
  scrollY: number;
  scrollTo: (x: number, y: number) => void;
}): void {
  if (target.scrollX === 0 && target.scrollY === 0) {
    return;
  }
  target.scrollTo(0, 0);
}
