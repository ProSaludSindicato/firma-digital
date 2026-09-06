export const PDFJS_PUBLIC_WORKER_PATH = "/pdf.worker.js";

export function resolvePdfjsWorkerSrc(
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  if (!origin) {
    return PDFJS_PUBLIC_WORKER_PATH;
  }

  return new URL(PDFJS_PUBLIC_WORKER_PATH, origin).href;
}

export function isPdfjsFakeWorkerError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Setting up fake worker failed|Importing a module script failed/i.test(
    message,
  );
}
