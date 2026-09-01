import { describe, expect, it } from "vitest";
import { computeAutoGrowFieldWidth } from "@/lib/fieldAutoWidth";

describe("computeAutoGrowFieldWidth", () => {
  it("returns a wider field width when content exceeds the current box", () => {
    const next = computeAutoGrowFieldWidth(120, 1, "text", 80);
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThan(80);
  });

  it("returns null when the current width already fits the content", () => {
    const next = computeAutoGrowFieldWidth(40, 1, "text", 180);
    expect(next).toBeNull();
  });

  it("respects max width limits for number fields", () => {
    const next = computeAutoGrowFieldWidth(500, 1, "number", 72);
    expect(next).toBe(240);
  });
});
