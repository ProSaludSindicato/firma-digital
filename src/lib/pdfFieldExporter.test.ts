import { describe, expect, it } from "vitest";
import { fontSizeForBoxHeight } from "@/lib/fieldDefaults";
import { fieldToPdfRect } from "@/lib/pdfFieldExporter";
import type { DocumentField } from "@/types/documentEditor";

describe("fieldToPdfRect", () => {
  it("converts center-based canvas coords to PDF bottom-left origin", () => {
    const field: DocumentField = {
      id: "f1",
      type: "text",
      label: "Nombre",
      required: true,
      page: 1,
      x: 100,
      y: 50,
      width: 80,
      height: 20,
      scale: 1,
      value: null,
    };

    const rect = fieldToPdfRect(field, 800);

    expect(rect.width).toBe(80);
    expect(rect.height).toBe(20);
    expect(rect.x).toBe(60);
    expect(rect.y).toBe(740);
  });

  it("accounts for the stored viewer scale", () => {
    const field: DocumentField = {
      id: "f1",
      type: "text",
      label: "Nombre",
      required: true,
      page: 1,
      x: 200,
      y: 100,
      width: 160,
      height: 40,
      scale: 2,
      value: null,
    };

    const rect = fieldToPdfRect(field, 800);

    expect(rect.width).toBe(80);
    expect(rect.height).toBe(20);
    expect(rect.x).toBe(60);
    expect(rect.y).toBe(740);
  });
});

describe("fontSizeForBoxHeight", () => {
  it("scales with the box height instead of using a fixed cap", () => {
    expect(fontSizeForBoxHeight(20)).toBeCloseTo(14.4);
    expect(fontSizeForBoxHeight(40)).toBeCloseTo(28.8);
    expect(fontSizeForBoxHeight(4, 6, 96)).toBe(6);
  });
});
