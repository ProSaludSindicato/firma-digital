import { describe, expect, it } from "vitest";
import { fontSizeForBoxHeight } from "@/lib/fieldDefaults";
import { fieldToPdfRect, signatureImagePdfRect } from "@/lib/pdfFieldExporter";
import type { DocumentField } from "@/types/documentEditor";

function makeField(overrides: Partial<DocumentField> = {}): DocumentField {
  return {
    id: "f1",
    type: "signature",
    label: "Firma",
    required: true,
    page: 1,
    x: 100,
    y: 50,
    width: 80,
    height: 20,
    scale: 1,
    value: null,
    ...overrides,
  };
}

describe("fieldToPdfRect", () => {
  it("converts center-based canvas coords to PDF bottom-left origin", () => {
    const rect = fieldToPdfRect(makeField({ type: "text", label: "Nombre" }), 800);

    expect(rect.width).toBe(80);
    expect(rect.height).toBe(20);
    expect(rect.x).toBe(60);
    expect(rect.y).toBe(740);
  });

  it("accounts for the stored viewer scale", () => {
    const rect = fieldToPdfRect(
      makeField({
        type: "text",
        label: "Nombre",
        x: 200,
        y: 100,
        width: 160,
        height: 40,
        scale: 2,
      }),
      800,
    );

    expect(rect.width).toBe(80);
    expect(rect.height).toBe(20);
    expect(rect.x).toBe(60);
    expect(rect.y).toBe(740);
  });
});

describe("signatureImagePdfRect", () => {
  it("fits a wide signature to the inner width and centers it vertically", () => {
    const box = fieldToPdfRect(makeField(), 800);
    const rect = signatureImagePdfRect(makeField(), 800, 6);

    expect(rect.width).toBe(78);
    expect(rect.height).toBeCloseTo(13);
    expect(rect.x).toBe(61);
    expect(rect.y).toBeCloseTo(box.y + 1 + (18 - 13) / 2);
  });

  it("fits a taller signature to the inner height and centers it horizontally", () => {
    const rect = signatureImagePdfRect(makeField(), 800, 2);

    expect(rect.height).toBe(18);
    expect(rect.width).toBe(36);
    expect(rect.x).toBe(61 + (78 - 36) / 2);
    expect(rect.y).toBe(741);
  });

  it("does not pin the image to the top-left of the box", () => {
    const box = fieldToPdfRect(makeField(), 800);
    const rect = signatureImagePdfRect(makeField(), 800, 6);

    expect(rect.x).toBeGreaterThan(box.x);
    expect(rect.y).toBeGreaterThan(box.y);
    expect(rect.x + rect.width).toBeLessThan(box.x + box.width);
    expect(rect.y + rect.height).toBeLessThan(box.y + box.height);
  });

  it("scales the 1px viewer border into PDF points", () => {
    const field = makeField({
      x: 200,
      y: 100,
      width: 160,
      height: 40,
      scale: 2,
    });
    const box = fieldToPdfRect(field, 800);
    const rect = signatureImagePdfRect(field, 800, 6);

    expect(box.x).toBe(60);
    expect(rect.x).toBeCloseTo(60.5);
    expect(rect.width).toBeCloseTo(79);
    expect(rect.height).toBeCloseTo(79 / 6);
  });
});

describe("fontSizeForBoxHeight", () => {
  it("scales with the box height instead of using a fixed cap", () => {
    expect(fontSizeForBoxHeight(20)).toBeCloseTo(14.4);
    expect(fontSizeForBoxHeight(40)).toBeCloseTo(28.8);
    expect(fontSizeForBoxHeight(4, 6, 96)).toBe(6);
  });
});
