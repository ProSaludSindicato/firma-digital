import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";

/**
 * Configuración por defecto para la firma automática
 * Estos valores se usan cuando no se especifican en la vista
 */
/**
 * La imagen de firma por defecto es 120×158 px (aspect ratio ≈ 0.76).
 * Mantenemos width:height ≈ 0.76 para preservar el aspect ratio y evitar
 * estirar la firma. Si el aspect ratio cambia, la imagen se verá deformada.
 */
export const DEFAULT_AUTO_SIGN_CONFIG: AutoSignatureConfig = {
  page: 2,   // Página 2 (donde está el bloque de firma en convenios ProSalud)
  x: 80,     // Margen izquierdo del bloque de firma (columna izquierda)
  y: 255,    // Y de la línea de firma (coordenada PDF, origen inferior-izquierda)
  width: 38, // Ancho en puntos PDF (≈1.3 cm). Aspect ratio ≈ 0.76.
  height: 50, // Alto en puntos PDF (≈1.8 cm). Aspect ratio ≈ 0.76. (-5pt ≈ -1.8mm vs anterior)
};

/**
 * Configuración de compresión de imagen para firmas automáticas
 * Preserva la transparencia para imágenes PNG
 */
export const AUTO_SIGN_IMAGE_OPTIONS = {
  maxWidth: 800,
  maxHeight: 400,
  quality: 1.0, // Máxima calidad para preservar detalles
  // El formato se detecta automáticamente basado en el tipo de archivo
};

/**
 * Configuración para búsqueda de texto con IA
 */
export const AI_SEARCH_CONFIG = {
  searchText: "JORGE IVAN ÁLVAREZ SOTO", // Texto de referencia para ubicar la firma
  anchorText: "PRESIDENTE", // Texto ancla único en el documento (aparece solo en el bloque de firma)
  defaultSearchPage: 2, // Página por defecto donde buscar la firma
  offsetX: 0, // Offset horizontal desde la línea de firma (puntos PDF)
  offsetY: 0, // Offset vertical desde la línea de firma (puntos PDF, 0 = sobre la línea)
};

