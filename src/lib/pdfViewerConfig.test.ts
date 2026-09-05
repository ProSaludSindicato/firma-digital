import { describe, expect, it } from "vitest";
import {
  getCanvasPixelRatio,
  getResponsiveViewerZoom,
  pdfViewerZoom,
  stepViewerZoom,
} from "@/lib/pdfViewerConfig";

describe("getResponsiveViewerZoom", () => {
  it("starts at 200% on large desktop screens", () => {
    expect(getResponsiveViewerZoom(1200, 800)).toBe(pdfViewerZoom.desktopDefault);
    expect(getResponsiveViewerZoom(1440, 900)).toBe(2);
    expect(getResponsiveViewerZoom(1920, 1080)).toBe(2);
  });

  it("keeps a lower default on laptops below the desktop breakpoint", () => {
    expect(getResponsiveViewerZoom(1024, 768)).toBe(1.6);
    expect(getResponsiveViewerZoom(768, 1024)).toBe(1.2);
  });

  it("fits phone landscape to the viewport instead of the desktop default", () => {
    const zoom = getResponsiveViewerZoom(844, 390);
    expect(zoom).toBeLessThan(pdfViewerZoom.desktopDefault);
    expect(zoom).toBeGreaterThanOrEqual(pdfViewerZoom.min);
  });

  it("lets portrait phones reach 100% so the page stays readable", () => {
    expect(getResponsiveViewerZoom(620, 844)).toBe(1);
  });
});

describe("getCanvasPixelRatio", () => {
  it("caps device pixel ratio at the requested maximum", () => {
    const original = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });

    expect(getCanvasPixelRatio(1)).toBe(1);
    expect(getCanvasPixelRatio(3)).toBe(3);

    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: original,
    });
  });
});

describe("stepViewerZoom", () => {
  it("allows zooming past 200% up to the configured max", () => {
    expect(stepViewerZoom(2, 1)).toBeCloseTo(2.2);
    expect(stepViewerZoom(2.8, 1)).toBeCloseTo(3);
    expect(stepViewerZoom(pdfViewerZoom.max, 1)).toBe(pdfViewerZoom.max);
  });

  it("does not go below the minimum", () => {
    expect(stepViewerZoom(pdfViewerZoom.min, -1)).toBe(pdfViewerZoom.min);
  });
});
