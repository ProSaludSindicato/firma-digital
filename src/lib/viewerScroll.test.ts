import { describe, expect, it } from "vitest";
import { preserveScrollCenterOnScaleChange } from "@/lib/viewerScroll";

describe("preserveScrollCenterOnScaleChange", () => {
  it("keeps the visual center when zooming in from a fitted page", () => {
    expect(
      preserveScrollCenterOnScaleChange(
        { scrollLeft: 0, scrollTop: 100, clientWidth: 390, clientHeight: 500 },
        2,
      ),
    ).toEqual({
      scrollLeft: 195,
      scrollTop: 450,
    });
  });

  it("keeps the visual center when the user had already panned", () => {
    expect(
      preserveScrollCenterOnScaleChange(
        { scrollLeft: 80, scrollTop: 40, clientWidth: 400, clientHeight: 600 },
        1.5,
      ),
    ).toEqual({
      scrollLeft: 220,
      scrollTop: 210,
    });
  });

  it("ignores invalid scale ratios", () => {
    const container = { scrollLeft: 12, scrollTop: 8, clientWidth: 300, clientHeight: 400 };
    expect(preserveScrollCenterOnScaleChange(container, 0)).toEqual({
      scrollLeft: 12,
      scrollTop: 8,
    });
  });
});
