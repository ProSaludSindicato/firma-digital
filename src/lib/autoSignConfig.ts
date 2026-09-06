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
  width: 48, // Ancho en puntos PDF (≈1.7 cm). Aspect ratio ≈ 0.76.
  height: 63, // Alto en puntos PDF (≈2.2 cm). Aspect ratio ≈ 0.76.
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
  offsetX: 0, // Offset horizontal desde el texto del firmante (puntos PDF)
  offsetY: -14, // Baja la firma para solapar el nombre y evitar una captura limpia
};

