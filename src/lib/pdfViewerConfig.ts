/**
 * Ajustes del visor PDF en el flujo de firma (página principal).
 * Cambia aquí el comportamiento sin tocar la lógica del componente.
 */

/** Alineación vertical al enfocar la página de firma (banner "Ve a la página…", etc.). */
export type SignaturePageScrollBlock = "start" | "end";

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
