import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";

/**
 * Configuración por defecto para la firma automática
 * Estos valores se usan cuando no se especifican en la vista
 */
export const DEFAULT_AUTO_SIGN_CONFIG: AutoSignatureConfig = {
  page: 2, // Primera página por defecto
  x: 80, // 50 puntos desde la izquierda
  y: 255, // 50 puntos desde abajo
  width: 42, // Ancho de 150 puntos (aproximadamente 5.3 cm)
  height: 55, // Alto de 60 puntos (aproximadamente 2.1 cm)
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
  offsetX: 0, // Offset horizontal desde el texto (puntos PDF)
  offsetY: -30, // Offset vertical desde el texto (puntos PDF, negativo = arriba)
  model: "gemini-2.5-flash", // Modelo de Gemini a usar (puede ser gemini-1.5-flash como alternativa)
};

/**
 * Obtiene la API key de Gemini desde las variables de entorno
 * En producción, esto debería venir de variables de entorno del servidor
 */
export const getGeminiApiKey = (): string | null => {
  // Intentar obtener de variable de entorno (si está disponible)
  if (typeof window !== "undefined") {
    // En el cliente, podrías usar un input o configuración
    // Por ahora, retornamos null y se pedirá al usuario
    return null;
  }
  return null;
};

