export type ScrollContainerLike = {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
};

/**
 * Mantiene el punto visual central al cambiar el zoom del visor.
 * Evita que el documento “salte” al borde izquierdo cuando la página
 * pasa a ser más ancha que el contenedor.
 */
export function preserveScrollCenterOnScaleChange(
  container: ScrollContainerLike,
  scaleRatio: number,
): { scrollLeft: number; scrollTop: number } {
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) {
    return {
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  }

  return {
    scrollLeft:
      container.scrollLeft * scaleRatio +
      (container.clientWidth * (scaleRatio - 1)) / 2,
    scrollTop:
      container.scrollTop * scaleRatio +
      (container.clientHeight * (scaleRatio - 1)) / 2,
  };
}
