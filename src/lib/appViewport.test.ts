import { describe, expect, it, vi } from "vitest";
import {
  applyAppViewportCssVars,
  measureAppViewport,
  resetDocumentScroll,
} from "@/lib/appViewport";

describe("measureAppViewport", () => {
  it("prefers the visual viewport over the fallback height", () => {
    expect(
      measureAppViewport({ height: 612.4, offsetTop: 88.6 }, 844),
    ).toEqual({ height: 612, offsetTop: 89 });
  });

  it("falls back when the visual viewport is missing", () => {
    expect(measureAppViewport(undefined, 720)).toEqual({
      height: 720,
      offsetTop: 0,
    });
  });

  it("never reports a zero or negative height", () => {
    expect(measureAppViewport({ height: 0, offsetTop: -12 }, 0)).toEqual({
      height: 1,
      offsetTop: 0,
    });
  });
});

describe("applyAppViewportCssVars", () => {
  it("writes pixel CSS variables for height and offset", () => {
    const style = {
      setProperty: vi.fn(),
    } as unknown as CSSStyleDeclaration;

    applyAppViewportCssVars(style, { height: 640, offsetTop: 24 });

    expect(style.setProperty).toHaveBeenCalledWith("--app-height", "640px");
    expect(style.setProperty).toHaveBeenCalledWith("--app-offset-top", "24px");
  });
});

describe("resetDocumentScroll", () => {
  it("scrolls back to the origin when the document has moved", () => {
    const scrollTo = vi.fn();
    resetDocumentScroll({ scrollX: 0, scrollY: 120, scrollTo });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("does not scroll when the document is already at the origin", () => {
    const scrollTo = vi.fn();
    resetDocumentScroll({ scrollX: 0, scrollY: 0, scrollTo });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
