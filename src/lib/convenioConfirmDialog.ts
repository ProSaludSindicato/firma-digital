export const CONVENIO_DIALOG_CLOSE_SETTLE_MS = 400;
export const CONVENIO_SUCCESS_VIEW_DELAY_MS = 300;
export const CONVENIO_SUBMIT_PROGRESS_TICK_MS = 500;

export type ConvenioSubmitPhase =
  | "idle"
  | "preparing"
  | "exporting"
  | "sending"
  | "confirming"
  | "finishing";

export const CONVENIO_SUBMIT_PHASE_COPY: Record<
  Exclude<ConvenioSubmitPhase, "idle">,
  string
> = {
  preparing: "Preparando tu convenio firmado…",
  exporting: "Insertando tu firma en el documento…",
  sending: "Enviando a ProSalud. Esto puede tardar unos segundos…",
  confirming: "Confirmando que el convenio llegó…",
  finishing: "Listo. Abriendo la confirmación…",
};

const PHASE_PROGRESS: Record<
  Exclude<ConvenioSubmitPhase, "idle">,
  { start: number; cap: number; stepRatio: number }
> = {
  preparing: { start: 4, cap: 10, stepRatio: 0.25 },
  exporting: { start: 12, cap: 34, stepRatio: 0.05 },
  sending: { start: 36, cap: 96, stepRatio: 0.01 },
  confirming: { start: 97, cap: 99, stepRatio: 0.2 },
  finishing: { start: 100, cap: 100, stepRatio: 1 },
};

export function shouldIgnoreConfirmDialogClose(
  isSubmitting: boolean,
  nextOpen: boolean,
): boolean {
  return isSubmitting && !nextOpen;
}

export function confirmSuccessTransitionDelays(): {
  closeDialogAfterMs: number;
  showSuccessAfterMs: number;
} {
  return {
    closeDialogAfterMs: CONVENIO_DIALOG_CLOSE_SETTLE_MS,
    showSuccessAfterMs: CONVENIO_DIALOG_CLOSE_SETTLE_MS + CONVENIO_SUCCESS_VIEW_DELAY_MS,
  };
}

export function convenioSubmitPhaseCopy(phase: ConvenioSubmitPhase): string {
  if (phase === "idle") {
    return "";
  }

  return CONVENIO_SUBMIT_PHASE_COPY[phase];
}

export function convenioSubmitPhaseStart(phase: ConvenioSubmitPhase): number {
  if (phase === "idle") {
    return 0;
  }

  return PHASE_PROGRESS[phase].start;
}

export function nextSubmitProgress(
  current: number,
  phase: ConvenioSubmitPhase,
): number {
  if (phase === "idle") {
    return 0;
  }

  const { start, cap, stepRatio } = PHASE_PROGRESS[phase];
  const floor = Math.max(current, start);
  if (floor >= cap) {
    return cap;
  }

  const remaining = cap - floor;
  const step = Math.max(1, Math.round(remaining * stepRatio));
  return Math.min(cap, floor + step);
}
