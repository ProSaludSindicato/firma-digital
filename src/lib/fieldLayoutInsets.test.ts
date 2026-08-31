import { describe, expect, it } from "vitest";
import { FIELD_FONT_SIZE_RATIO } from "@/lib/fieldDefaults";
import {
  exportFontSizePt,
  fieldContentLeftX,
  fieldTextBaselineY,
  fieldTextPaddingPt,
} from "@/lib/fieldLayoutInsets";

describe("fieldLayoutInsets", () => {
  it("converts canvas padding to PDF points using the stored scale", () => {
    expect(fieldTextPaddingPt(2)).toBe(2);
    expect(fieldTextPaddingPt(1)).toBe(4);
  });

  it("uses the full box height for export font size (matches 72cqh in the viewer)", () => {
    expect(exportFontSizePt(20)).toBeCloseTo(20 * FIELD_FONT_SIZE_RATIO);
  });

  it("offsets content from the exported box using the same padding as the viewer", () => {
    const rect = { x: 100, y: 200, width: 80, height: 24 };
    const fontSize = exportFontSizePt(24);

    expect(fieldContentLeftX(rect, 1)).toBe(104);
    expect(fieldTextBaselineY(rect, fontSize, 1)).toBeCloseTo(
      224 - 4 - fontSize * 0.85,
    );
  });
});
