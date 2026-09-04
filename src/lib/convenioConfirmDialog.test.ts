import { describe, expect, it } from "vitest";
import {
  CONVENIO_DIALOG_CLOSE_SETTLE_MS,
  CONVENIO_SUCCESS_VIEW_DELAY_MS,
  confirmSuccessTransitionDelays,
  convenioSubmitPhaseCopy,
  convenioSubmitPhaseStart,
  nextSubmitProgress,
  shouldIgnoreConfirmDialogClose,
} from "@/lib/convenioConfirmDialog";

describe("convenioConfirmDialog", () => {
  it("keeps the confirm dialog open while a submit is in flight", () => {
    expect(shouldIgnoreConfirmDialogClose(true, false)).toBe(true);
    expect(shouldIgnoreConfirmDialogClose(true, true)).toBe(false);
    expect(shouldIgnoreConfirmDialogClose(false, false)).toBe(false);
  });

  it("shows the finishing message before swapping to the success view", () => {
    const delays = confirmSuccessTransitionDelays();

    expect(delays.closeDialogAfterMs).toBe(CONVENIO_DIALOG_CLOSE_SETTLE_MS);
    expect(delays.showSuccessAfterMs).toBeGreaterThan(delays.closeDialogAfterMs);
    expect(delays.showSuccessAfterMs - delays.closeDialogAfterMs).toBe(
      CONVENIO_SUCCESS_VIEW_DELAY_MS,
    );
    expect(CONVENIO_SUCCESS_VIEW_DELAY_MS).toBeGreaterThanOrEqual(250);
  });

  it("uses distinct copy for each submit phase", () => {
    expect(convenioSubmitPhaseCopy("preparing")).toMatch(/preparando/i);
    expect(convenioSubmitPhaseCopy("exporting")).toMatch(/firma/i);
    expect(convenioSubmitPhaseCopy("sending")).toMatch(/enviando/i);
    expect(convenioSubmitPhaseCopy("confirming")).toMatch(/confirmando/i);
    expect(convenioSubmitPhaseCopy("finishing")).toMatch(/listo/i);
    expect(convenioSubmitPhaseCopy("idle")).toBe("");
  });

  it("advances progress within the current phase without reaching 100% early", () => {
    expect(convenioSubmitPhaseStart("exporting")).toBeGreaterThan(
      convenioSubmitPhaseStart("preparing"),
    );
    expect(convenioSubmitPhaseStart("sending")).toBeLessThan(40);

    let progress = convenioSubmitPhaseStart("exporting");
    progress = nextSubmitProgress(progress, "exporting");
    expect(progress).toBeGreaterThan(convenioSubmitPhaseStart("exporting"));
    expect(progress).toBeLessThan(100);

    let sendingProgress = convenioSubmitPhaseStart("sending");
    for (let i = 0; i < 5; i += 1) {
      sendingProgress = nextSubmitProgress(sendingProgress, "sending");
    }
    expect(sendingProgress).toBeGreaterThan(convenioSubmitPhaseStart("sending"));
    expect(sendingProgress).toBeLessThan(96);

    expect(nextSubmitProgress(0, "finishing")).toBe(100);
  });
});
