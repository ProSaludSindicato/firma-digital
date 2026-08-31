import { describe, expect, it } from "vitest";
import {
  canExportDocument,
  canFinishDocument,
  getFieldProgressCounts,
  getFinishDisabledTitle,
  getIncompleteRequiredFields,
  isFieldFilled,
  isFieldVisuallyComplete,
} from "@/lib/fieldValidation";
import type { DocumentField } from "@/types/documentEditor";

const field = (overrides: Partial<DocumentField> = {}): DocumentField => ({
  id: "f1",
  type: "text",
  label: "Nombre",
  required: true,
  page: 1,
  x: 10,
  y: 10,
  width: 100,
  height: 24,
  scale: 1,
  value: null,
  ...overrides,
});

describe("fieldValidation", () => {
  it("treats empty required text as incomplete", () => {
    const empty = field();
    expect(isFieldFilled(empty)).toBe(false);
    expect(getIncompleteRequiredFields([empty])).toEqual([empty]);
    expect(canExportDocument([empty])).toBe(false);
  });

  it("accepts filled text and optional empty fields", () => {
    const filled = field({
      value: { type: "text", text: "  Ana " },
    });
    const optional = field({
      id: "f2",
      required: false,
      value: null,
    });

    expect(isFieldFilled(filled)).toBe(true);
    expect(getIncompleteRequiredFields([filled, optional])).toEqual([]);
    expect(canExportDocument([filled, optional])).toBe(true);
  });

  it("requires a checked checkbox when the field is required", () => {
    const unchecked = field({
      type: "checkbox",
      required: true,
      value: { type: "checkbox", checked: false },
    });
    const checked = field({
      id: "f2",
      type: "checkbox",
      required: true,
      value: { type: "checkbox", checked: true },
    });

    expect(isFieldFilled(unchecked)).toBe(false);
    expect(isFieldFilled(checked)).toBe(true);
  });

  it("does not allow exporting an empty field list", () => {
    expect(canExportDocument([])).toBe(false);
  });

  it("marks optional unchecked checkbox as visually incomplete", () => {
    const optionalUnchecked = field({
      type: "checkbox",
      required: false,
      value: { type: "checkbox", checked: false },
    });

    expect(isFieldFilled(optionalUnchecked)).toBe(true);
    expect(isFieldVisuallyComplete(optionalUnchecked)).toBe(false);
  });

  it("computes progress counts and finish eligibility", () => {
    const empty = field();
    const filled = field({
      id: "f2",
      value: { type: "text", text: "Ana" },
    });

    expect(getFieldProgressCounts([])).toEqual({
      total: 0,
      completed: 0,
      pending: 0,
    });
    expect(getFinishDisabledTitle([])).toBe(
      "Agrega al menos un campo para continuar",
    );
    expect(canFinishDocument([])).toBe(false);

    expect(getFieldProgressCounts([empty, filled])).toEqual({
      total: 2,
      completed: 1,
      pending: 1,
    });
    expect(getFinishDisabledTitle([empty, filled])).toBe(
      "Completa los campos pendientes antes de enviar",
    );
    expect(canFinishDocument([empty, filled])).toBe(false);
    expect(canFinishDocument([filled])).toBe(true);
  });
});
