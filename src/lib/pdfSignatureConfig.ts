/**
 * Ajuste fino entre la vista previa del visor y el PDF descargado.
 * Valores en píxeles de canvas antes de convertir a puntos PDF.
 */
export const pdfSignatureConfig = {
  /**
   * Corrección horizontal final.
   * Negativo: mueve a la izquierda. Positivo: mueve a la derecha.
   */
  exportOffsetX: 0,
  /**
   * Corrección vertical final.
   * Negativo: mueve hacia abajo. Positivo: mueve hacia arriba.
   */
  exportOffsetY: 0,
} as const;
