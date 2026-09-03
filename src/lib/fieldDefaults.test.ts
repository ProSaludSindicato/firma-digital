import { describe, expect, it } from "vitest";
import { getFieldSizeLimits } from "@/lib/fieldDefaults";

describe("getFieldSizeLimits signature", () => {
  it("keeps a compact default box on desktop", () => {
    const limits = getFieldSizeLimits("signature", false);

    expect(limits.defaultWidth).toBe(106);
    expect(limits.defaultHeight).toBe(48);
  });

  it("keeps a compact default box on mobile", () => {
    const limits = getFieldSizeLimits("signature", true);

    expect(limits.defaultWidth).toBe(86);
    expect(limits.defaultHeight).toBe(34);
  });
});
