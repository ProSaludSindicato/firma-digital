import { describe, expect, it, vi } from "vitest";
import {
  CONVENIO_SUCCESS_VIEW_DELAY_MS,
  preventConfirmDialogAutoClose,
  shouldIgnoreConfirmDialogClose,
} from "@/lib/convenioConfirmDialog";

describe("convenioConfirmDialog", () => {
  it("keeps the confirm dialog open while a submit is in flight", () => {
    expect(shouldIgnoreConfirmDialogClose(true, false)).toBe(true);
    expect(shouldIgnoreConfirmDialogClose(true, true)).toBe(false);
    expect(shouldIgnoreConfirmDialogClose(false, false)).toBe(false);
  });

  it("prevents Radix AlertDialogAction from closing immediately", () => {
    const event = { preventDefault: vi.fn() };
    preventConfirmDialogAutoClose(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("waits for the close animation before swapping to the success view", () => {
    expect(CONVENIO_SUCCESS_VIEW_DELAY_MS).toBeGreaterThanOrEqual(200);
  });
});
