import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppViewportLock } from "./useAppViewportLock";

describe("useAppViewportLock", () => {
  const originalVisualViewport = window.visualViewport;
  let listeners: Record<string, Array<() => void>>;

  beforeEach(() => {
    listeners = {};
    vi.useFakeTimers();
    document.documentElement.style.removeProperty("--app-height");
    document.documentElement.style.removeProperty("--app-offset-top");

    const visualViewport = {
      height: 640,
      offsetTop: 32,
      addEventListener: (type: string, handler: () => void) => {
        listeners[type] ??= [];
        listeners[type].push(handler);
      },
      removeEventListener: (type: string, handler: () => void) => {
        listeners[type] = (listeners[type] ?? []).filter((item) => item !== handler);
      },
    };

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: originalVisualViewport,
    });
  });

  it("pins the document to the visual viewport on mount", () => {
    renderHook(() => useAppViewportLock());

    expect(document.documentElement.style.getPropertyValue("--app-height")).toBe("640px");
    expect(document.documentElement.style.getPropertyValue("--app-offset-top")).toBe("32px");
  });

  it("updates CSS variables when the visual viewport resizes", () => {
    renderHook(() => useAppViewportLock());

    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      value: 588,
    });
    Object.defineProperty(window.visualViewport!, "offsetTop", {
      configurable: true,
      value: 0,
    });

    act(() => {
      for (const handler of listeners.resize ?? []) {
        handler();
      }
    });

    expect(document.documentElement.style.getPropertyValue("--app-height")).toBe("588px");
    expect(document.documentElement.style.getPropertyValue("--app-offset-top")).toBe("0px");
  });
});
