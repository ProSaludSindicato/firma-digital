import { afterEach, describe, expect, it } from "vitest";
import {
  consumePinchZoomHint,
  resetPinchZoomHint,
} from "@/lib/pinchZoomHint";

describe("consumePinchZoomHint", () => {
  afterEach(() => {
    resetPinchZoomHint();
  });

  it("allows the first hint and then blocks repeats", () => {
    expect(consumePinchZoomHint()).toBe(true);
    expect(consumePinchZoomHint()).toBe(false);
  });

  it("can be reset for a later session", () => {
    consumePinchZoomHint();
    resetPinchZoomHint();
    expect(consumePinchZoomHint()).toBe(true);
  });
});
