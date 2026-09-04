export const CONVENIO_SUCCESS_VIEW_DELAY_MS = 250;

export function shouldIgnoreConfirmDialogClose(
  isSubmitting: boolean,
  nextOpen: boolean,
): boolean {
  return isSubmitting && !nextOpen;
}

export function preventConfirmDialogAutoClose(event: { preventDefault: () => void }): void {
  event.preventDefault();
}
