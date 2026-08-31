import { getScaledFieldSizeLimits } from "@/lib/fieldDefaults";
import { FIELD_TEXT_PADDING_PX } from "@/lib/fieldLayoutInsets";
import type { DocumentField, FieldType } from "@/types/documentEditor";

export function measureInputContentWidth(
  element: HTMLElement,
  text: string,
): number {
  const style = window.getComputedStyle(element);
  const mirror = document.createElement("span");
  mirror.setAttribute("aria-hidden", "true");
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre",
    top: "0",
    left: "-9999px",
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontVariantNumeric: style.fontVariantNumeric || "normal",
    letterSpacing: style.letterSpacing,
  });
  mirror.textContent = text.length > 0 ? text : "0";
  document.body.appendChild(mirror);
  const width = mirror.getBoundingClientRect().width;
  mirror.remove();
  return width;
}

export function computeAutoGrowFieldWidth(
  measuredDisplayPx: number,
  scaleRatio: number,
  type: FieldType,
  currentWidth: number,
  isMobile = false,
  placementScale = 1,
): number | null {
  if (scaleRatio <= 0) {
    return null;
  }

  const limits = getScaledFieldSizeLimits(type, placementScale, isMobile);
  const extraPad = type === "number" ? 16 : 8;
  const horizontalPad = FIELD_TEXT_PADDING_PX * 2 + extraPad;
  const neededFieldWidth = Math.ceil(
    (measuredDisplayPx + horizontalPad) / scaleRatio,
  );
  const clamped = Math.min(
    limits.maxWidth,
    Math.max(limits.minWidth, neededFieldWidth),
  );

  if (clamped > currentWidth + 0.5) {
    return clamped;
  }

  return null;
}

export function getAutoGrowMeasureText(
  draft: string,
  placeholder: string,
  fallbackLabel: string,
): string {
  if (draft.length > 0) {
    return draft;
  }
  if (placeholder.length > 0) {
    return placeholder;
  }
  return fallbackLabel;
}

export function resizeFieldToContent(
  element: HTMLElement,
  field: DocumentField,
  draft: string,
  placeholder: string,
  scaleRatio: number,
  isMobile: boolean,
  onResizeWidth: (width: number) => void,
): void {
  const text = getAutoGrowMeasureText(draft, placeholder, field.label);
  const measured = measureInputContentWidth(element, text);
  const nextWidth = computeAutoGrowFieldWidth(
    measured,
    scaleRatio,
    field.type,
    field.width,
    isMobile,
    field.scale || 1,
  );

  if (nextWidth != null) {
    onResizeWidth(nextWidth);
  }
}
