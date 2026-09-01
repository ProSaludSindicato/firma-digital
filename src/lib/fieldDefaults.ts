import type {
  ApiDocumentField,
  DocumentField,
  FieldType,
  PlaceFieldParams,
} from "@/types/documentEditor";

export const ALL_FIELD_TYPES: FieldType[] = [
  "signature",
  "text",
  "number",
  "date",
  "checkbox",
];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  signature: "Firma",
  text: "Texto",
  number: "Número",
  date: "Fecha",
  checkbox: "Casilla",
};

export function getPlacementHint(type: FieldType): string {
  switch (type) {
    case "signature":
      return "tu firma";
    case "text":
      return "un campo de texto";
    case "number":
      return "un número";
    case "date":
      return "una fecha";
    case "checkbox":
      return "una casilla";
  }
}

export function getDefaultFieldLabel(type: FieldType): string {
  if (type === "number") {
    return "Nº";
  }
  return FIELD_TYPE_LABELS[type];
}

export function getNumberFieldPlaceholder(label: string): string {
  if (
    label === FIELD_TYPE_LABELS.number ||
    label === "Número" ||
    label === "Nº"
  ) {
    return "0";
  }
  return label.length <= 3 ? label : `${label.slice(0, 3)}…`;
}

export interface FieldSizeLimits {
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  lockAspectRatio: boolean;
}

export function getFieldSizeLimits(
  type: FieldType,
  isMobile = false,
): FieldSizeLimits {
  switch (type) {
    case "signature":
      return {
        defaultWidth: isMobile ? 90 : 112,
        defaultHeight: isMobile ? 36 : 52,
        minWidth: isMobile ? 56 : 72,
        minHeight: isMobile ? 24 : 28,
        maxWidth: 320,
        maxHeight: 180,
        lockAspectRatio: true,
      };
    case "text":
      return {
        defaultWidth: isMobile ? 96 : 100,
        defaultHeight: isMobile ? 22 : 18,
        minWidth: isMobile ? 40 : 48,
        minHeight: isMobile ? 14 : 16,
        maxWidth: 480,
        maxHeight: 120,
        lockAspectRatio: false,
      };
    case "number":
      return {
        defaultWidth: isMobile ? 44 : 48,
        defaultHeight: isMobile ? 22 : 18,
        minWidth: isMobile ? 28 : 32,
        minHeight: isMobile ? 14 : 16,
        maxWidth: 240,
        maxHeight: 48,
        lockAspectRatio: false,
      };
    case "date":
      return {
        defaultWidth: isMobile ? 92 : 98,
        defaultHeight: isMobile ? 22 : 18,
        minWidth: isMobile ? 56 : 72,
        minHeight: isMobile ? 14 : 16,
        maxWidth: 220,
        maxHeight: 48,
        lockAspectRatio: false,
      };
    case "checkbox":
      return {
        defaultWidth: 22,
        defaultHeight: 22,
        minWidth: 14,
        minHeight: 14,
        maxWidth: 56,
        maxHeight: 56,
        lockAspectRatio: true,
      };
  }
}

/** Scale canvas-pixel limits to match the viewer zoom when the field was placed. */
export function scaleFieldSizeLimits(
  limits: FieldSizeLimits,
  placementScale: number,
): FieldSizeLimits {
  const scale = placementScale > 0 ? placementScale : 1;

  return {
    ...limits,
    defaultWidth: limits.defaultWidth * scale,
    defaultHeight: limits.defaultHeight * scale,
    minWidth: limits.minWidth * scale,
    minHeight: limits.minHeight * scale,
    maxWidth: limits.maxWidth * scale,
    maxHeight: limits.maxHeight * scale,
  };
}

export function getScaledFieldSizeLimits(
  type: FieldType,
  placementScale: number,
  isMobile = false,
): FieldSizeLimits {
  return scaleFieldSizeLimits(
    getFieldSizeLimits(type, isMobile),
    placementScale,
  );
}

/** Font size as a fraction of the field box height (viewer and PDF export). */
export const FIELD_FONT_SIZE_RATIO = 0.72;

export function fontSizeForBoxHeight(
  height: number,
  min = 6,
  max = 96,
): number {
  return Math.max(min, Math.min(max, height * FIELD_FONT_SIZE_RATIO));
}

export function createFieldId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDocumentField(
  params: PlaceFieldParams,
  isMobile = false,
): DocumentField {
  const limits = getScaledFieldSizeLimits(
    params.type,
    params.scale || 1,
    isMobile,
  );
  return {
    id: params.id ?? createFieldId(),
    type: params.type,
    label: params.label ?? getDefaultFieldLabel(params.type),
    required: params.required ?? params.type !== "checkbox",
    page: params.page,
    x: params.x,
    y: params.y,
    width: Math.round(limits.defaultWidth),
    height: Math.round(limits.defaultHeight),
    scale: params.scale,
    value:
      params.type === "checkbox"
        ? { type: "checkbox", checked: false }
        : null,
  };
}

/**
 * Converts API fields (PDF points, top-left origin) into editor fields
 * stored at scale=1 so the viewer can scale them with zoom.
 */
export function apiFieldsToDocumentFields(
  apiFields: ApiDocumentField[],
): {
    id: string;
    type: "signature" | "text" | "number" | "date" | "checkbox";
    label: string;
    required: boolean;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    value: { type: string; checked: boolean }
}[] {
  return apiFields.map((api) => {
    const width = Math.max(8, api.width);
    const height = Math.max(8, api.height);
    return {
      id: api.id ?? createFieldId(),
      type: api.type,
      label: api.label ?? getDefaultFieldLabel(api.type),
      required: api.required ?? api.type !== "checkbox",
      page: api.page,
      x: api.x + width / 2,
      y: api.y + height / 2,
      width,
      height,
      scale: 1,
      value:
        api.type === "checkbox"
          ? { type: "checkbox", checked: false }
          : null,
    };
  });
}
