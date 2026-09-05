let pinchZoomHintConsumed = false;

export const PINCH_ZOOM_HINT_TITLE = "Usa los botones de zoom";
export const PINCH_ZOOM_HINT_DESCRIPTION =
  "Pellizcar no está disponible. Usa los botones + y − sobre el documento para ampliar el texto.";

export function consumePinchZoomHint(): boolean {
  if (pinchZoomHintConsumed) {
    return false;
  }
  pinchZoomHintConsumed = true;
  return true;
}

export function resetPinchZoomHint(): void {
  pinchZoomHintConsumed = false;
}
