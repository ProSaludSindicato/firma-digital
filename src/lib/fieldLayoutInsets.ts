import { FIELD_FONT_SIZE_RATIO, fontSizeForBoxHeight } from "@/lib/fieldDefaults";

/** Inner padding of text/date inputs inside a field overlay (Tailwind px-1). */
export const FIELD_TEXT_PADDING_PX = 4;

/** Matches `TextField` / `DateField` line-height. */
export const VIEWER_LINE_HEIGHT = 1.15;

/**
 * Distance from the top padding edge to the first baseline in the viewer.
 * Tuned to match top-aligned textarea rendering in the browser.
 */
export const TEXT_BASELINE_FROM_PADDING_TOP = 0.85;

export function canvasPxToPdfPoints(px: number, storedScale: number): number {
  return px / (storedScale || 1);
}

export function fieldTextPaddingPt(storedScale: number): number {
  return canvasPxToPdfPoints(FIELD_TEXT_PADDING_PX, storedScale);
}

/** Font size in PDF points — mirrors `clamp(..., 72cqh, ...)` on the full box height. */
export function exportFontSizePt(boxHeightPt: number): number {
  return fontSizeForBoxHeight(boxHeightPt);
}

export function fieldContentLeftX(
  rect: { x: number },
  storedScale: number,
): number {
  return rect.x + fieldTextPaddingPt(storedScale);
}

export function fieldTextBaselineY(
  rect: { y: number; height: number },
  fontSize: number,
  storedScale: number,
): number {
  const offsetFromTop =
    fieldTextPaddingPt(storedScale) +
    fontSize * TEXT_BASELINE_FROM_PADDING_TOP;
  return rect.y + rect.height - offsetFromTop;
}

export function fieldTextContentHeightPt(
  boxHeightPt: number,
  storedScale: number,
): number {
  return Math.max(4, boxHeightPt - fieldTextPaddingPt(storedScale) * 2);
}

/** @deprecated Use exportFontSizePt — kept for tests/docs clarity. */
export const FIELD_FONT_SIZE_RATIO_EXPORT = FIELD_FONT_SIZE_RATIO;
