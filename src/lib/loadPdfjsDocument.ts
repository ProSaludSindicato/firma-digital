import { pdfjsLib } from "@/lib/pdfjsSetup";
import { copyPdfBytes } from "@/lib/convenioPdfLoad";

export type LoadPdfjsDocumentOptions = {
  onWorkerFallback?: (error: Error) => void;
};

async function getDocumentFromBytes(
  data: ArrayBuffer,
): Promise<pdfjsLib.PDFDocumentProxy> {
  return pdfjsLib.getDocument({
    data: copyPdfBytes(data),
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  }).promise;
}

export async function loadPdfjsDocumentFromBytes(
  data: ArrayBuffer,
  options: LoadPdfjsDocumentOptions = {},
): Promise<pdfjsLib.PDFDocumentProxy> {
  try {
    return await getDocumentFromBytes(data);
  } catch (firstError) {
    const error =
      firstError instanceof Error
        ? firstError
        : new Error("No se pudo cargar el PDF.");
    options.onWorkerFallback?.(error);

    const workerHost = globalThis as typeof globalThis & {
      pdfjsWorkerDisabled?: boolean;
    };
    const previousDisabled = workerHost.pdfjsWorkerDisabled;
    workerHost.pdfjsWorkerDisabled = true;

    try {
      await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
      return await getDocumentFromBytes(data);
    } finally {
      if (previousDisabled === undefined) {
        delete workerHost.pdfjsWorkerDisabled;
      } else {
        workerHost.pdfjsWorkerDisabled = previousDisabled;
      }
    }
  }
}
