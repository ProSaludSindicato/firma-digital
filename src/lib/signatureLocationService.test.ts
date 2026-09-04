import { describe, expect, it } from "vitest";
import { apiFieldsToDocumentFields } from "@/lib/fieldDefaults";
import { fieldToPdfRect } from "@/lib/pdfFieldExporter";
import {
  AFFILIATE_SIGNATURE_FALLBACK_X,
  AFFILIATE_SIGNATURE_OFFSET_X,
  AFFILIATE_SIGNATURE_OFFSET_Y,
  affiliateFieldFromSignatureLine,
  pickAffiliateSignatureLine,
  pickPresidentSignatureLine,
  resolveAffiliateSignatureLine,
  type HorizontalLine,
} from "@/lib/signatureLocationService";
import type { DocumentField } from "@/types/documentEditor";

const line = (
  overrides: Partial<HorizontalLine> & Pick<HorizontalLine, "x" | "y">,
): HorizontalLine => ({
  length: 80,
  ...overrides,
});

describe("pickPresidentSignatureLine", () => {
  it("picks the left-column line closest above the name baseline", () => {
    const picked = pickPresidentSignatureLine(
      [
        line({ x: 80, y: 250, length: 90 }),
        line({ x: 80, y: 265, length: 90 }),
        line({ x: 360, y: 250, length: 90 }),
      ],
      230,
    );

    expect(picked).toEqual(line({ x: 80, y: 250, length: 90 }));
  });

  it("ignores short marks and lines in the affiliate column", () => {
    const picked = pickPresidentSignatureLine(
      [
        line({ x: 80, y: 250, length: 20 }),
        line({ x: 360, y: 250, length: 90 }),
      ],
      230,
    );

    expect(picked).toBeNull();
  });
});

describe("pickAffiliateSignatureLine", () => {
  it("picks the right-column line aligned with the president line", () => {
    const picked = pickAffiliateSignatureLine(
      [
        line({ x: 80, y: 255, length: 90 }),
        line({ x: 390, y: 255, length: 90 }),
        line({ x: 370, y: 257, length: 90 }),
      ],
      255,
    );

    expect(picked).toEqual(line({ x: 390, y: 255, length: 90 }));
  });

  it("ignores the president column and lines too far in Y", () => {
    const picked = pickAffiliateSignatureLine(
      [
        line({ x: 80, y: 255, length: 90 }),
        line({ x: 360, y: 280, length: 90 }),
      ],
      255,
    );

    expect(picked).toBeNull();
  });
});

describe("resolveAffiliateSignatureLine", () => {
  it("falls back to the fixed right-column X when no right line exists", () => {
    const resolved = resolveAffiliateSignatureLine(
      [line({ x: 80, y: 255, length: 90 })],
      255,
    );

    expect(resolved).toEqual({
      x: AFFILIATE_SIGNATURE_FALLBACK_X,
      y: 255,
      length: 0,
    });
  });
});

describe("affiliateFieldFromSignatureLine", () => {
  it("converts PDF line Y (bottom-left) to an API field (top-left)", () => {
    const api = affiliateFieldFromSignatureLine({
      lineX: 360,
      lineY: 255,
      pageHeight: 792,
      page: 2,
      width: 106,
      height: 48,
    });

    expect(api).toEqual({
      type: "signature",
      page: 2,
      x: 360 + AFFILIATE_SIGNATURE_OFFSET_X,
      y: 792 - 255 - 48 - AFFILIATE_SIGNATURE_OFFSET_Y,
      width: 106,
      height: 48,
    });
  });

  it("round-trips through the editor field and back to the PDF line", () => {
    const api = affiliateFieldFromSignatureLine({
      lineX: 360,
      lineY: 255,
      pageHeight: 792,
      page: 2,
      width: 106,
      height: 48,
    });
    const [field] = apiFieldsToDocumentFields([api]) as DocumentField[];
    const rect = fieldToPdfRect(field, 792);

    expect(rect.x).toBe(360 + AFFILIATE_SIGNATURE_OFFSET_X);
    expect(rect.y).toBe(255 + AFFILIATE_SIGNATURE_OFFSET_Y);
    expect(rect.width).toBe(106);
    expect(rect.height).toBe(48);
  });
});
