import type { DocumentField } from "@/types/documentEditor";

export function isFieldFilled(field: DocumentField): boolean {
  if (!field.value) {
    return false;
  }

  switch (field.value.type) {
    case "signature":
      return field.value.dataUrl.trim().length > 0;
    case "text":
      return field.value.text.trim().length > 0;
    case "number":
      return field.value.value.trim().length > 0;
    case "date":
      return field.value.isoDate.trim().length > 0;
    case "checkbox":
      return field.required ? field.value.checked : true;
  }
}

/** Visual completion state shown on the document (checkbox = checked). */
export function isFieldVisuallyComplete(field: DocumentField): boolean {
  if (!field.value) {
    return false;
  }

  switch (field.value.type) {
    case "signature":
      return field.value.dataUrl.trim().length > 0;
    case "text":
      return field.value.text.trim().length > 0;
    case "number":
      return field.value.value.trim().length > 0;
    case "date":
      return field.value.isoDate.trim().length > 0;
    case "checkbox":
      return field.value.checked;
  }
}

export function getIncompleteRequiredFields(
  fields: DocumentField[],
): DocumentField[] {
  return fields.filter((field) => field.required && !isFieldFilled(field));
}

export function canExportDocument(fields: DocumentField[]): boolean {
  return fields.length > 0 && getIncompleteRequiredFields(fields).length === 0;
}

export function hasSignatureField(fields: DocumentField[]): boolean {
  return fields.some((field) => field.type === "signature");
}

export interface FieldProgressCounts {
  total: number;
  completed: number;
  pending: number;
}

export function getFieldProgressCounts(
  fields: DocumentField[],
): FieldProgressCounts {
  const completed = fields.filter(isFieldVisuallyComplete).length;
  return {
    total: fields.length,
    completed,
    pending: fields.length - completed,
  };
}

export function getFinishDisabledTitle(
  fields: DocumentField[],
): string | undefined {
  const { total, pending } = getFieldProgressCounts(fields);
  if (total === 0) {
    return "Agrega al menos un campo para continuar";
  }
  if (pending > 0) {
    return "Completa los campos pendientes antes de enviar";
  }
  return undefined;
}

export function canFinishDocument(fields: DocumentField[]): boolean {
  const { total, pending } = getFieldProgressCounts(fields);
  return total > 0 && pending === 0;
}
