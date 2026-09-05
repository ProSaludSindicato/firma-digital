/**
 * Ajustes del visor PDF en el flujo de firma (página principal).
 * Cambia aquí el comportamiento sin tocar la lógica del componente.
 */

/** Alineación vertical al enfocar la página de firma (banner "Ve a la página…", etc.). */
export type SignaturePageScrollBlock = "start" | "end";

/** Ancho mínimo (px) a partir del cual el visor abre a 200%. */
const DESKTOP_ZOOM_MIN_WIDTH = 1200;

export const pdfViewerZoom = {
  min: 0.5,
  max: 3,
  step: 0.2,
  /** Zoom inicial en pantallas de escritorio (≥ 1200 px). */
  desktopDefault: 2,
} as const;

export function getResponsiveViewerZoom(
  width = typeof window !== "undefined" ? window.innerWidth : 1024,
  height = typeof window !== "undefined" ? window.innerHeight : 768,
): number {
  if (height < 500 && width > height) {
    return Math.max(pdfViewerZoom.min, Math.min(1.6, (width - 24) / 612));
  }
  if (width >= DESKTOP_ZOOM_MIN_WIDTH) {
    return pdfViewerZoom.desktopDefault;
  }
  if (width >= 1024) {
    return 1.6;
  }
  if (width >= 768) {
    return 1.2;
  }
  const mobileZoom = (width - 8) / 612;
  return Math.max(pdfViewerZoom.min, Math.min(1.0, mobileZoom));
}

export function getCanvasPixelRatio(maxRatio = 3): number {
  return Math.min(window.devicePixelRatio || 1, maxRatio);
}

export function stepViewerZoom(scale: number, direction: 1 | -1): number {
  const next = scale + direction * pdfViewerZoom.step;
  return Math.min(pdfViewerZoom.max, Math.max(pdfViewerZoom.min, next));
}

export const pdfViewerConfig = {
  /**
   * Si es true, tras cargar el PDF navega automáticamente a la página de firma
   * tras `signaturePageScrollDelayMs`. Si es false, el documento abre siempre en la página 1.
   */
  scrollToSignaturePageOnLoad: false,
  /** Solo aplica cuando `scrollToSignaturePageOnLoad` es true. */
  signaturePageScrollDelayMs: 600,
  /**
   * Si es true, todas las páginas se muestran en columna con scroll continuo.
   * La firma sigue anclada por número de página; solo la página de firma acepta clics de colocación.
   */
  continuousScroll: true,
  /**
   * Solo con `continuousScroll`: al ir a la página de firma, ¿alinear el scroll al inicio o al final de esa página?
   * No afecta el salto a otras páginas (siguiente/anterior, miniaturas, etc.), que siguen alineando al inicio.
   */
  signaturePageScrollBlock: "end" satisfies SignaturePageScrollBlock,
} as const;
