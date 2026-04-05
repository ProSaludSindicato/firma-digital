/**
 * Ajustes del visor PDF en el flujo de firma (página principal).
 * Cambia aquí el comportamiento sin tocar la lógica del componente.
 */
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
} as const;
