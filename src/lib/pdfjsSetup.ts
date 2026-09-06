import { installPromiseWithResolversPolyfill } from "@/lib/promiseWithResolversPolyfill";
import { resolvePdfjsWorkerSrc } from "@/lib/pdfjsWorkerSrc";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";

installPromiseWithResolversPolyfill();

type PdfjsWorkerHost = typeof globalThis & {
  pdfjsWorker?: { WorkerMessageHandler: typeof WorkerMessageHandler };
};

type PdfjsWorkerConstructor = {
  _setupFakeWorkerGlobal?: Promise<typeof WorkerMessageHandler>;
};

export function installPdfjsMainThreadWorker(): void {
  const workerHost = globalThis as PdfjsWorkerHost;
  workerHost.pdfjsWorker = { WorkerMessageHandler };
  pdfjsLib.GlobalWorkerOptions.workerSrc = resolvePdfjsWorkerSrc();

  const pdfWorker = pdfjsLib.PDFWorker as unknown as PdfjsWorkerConstructor;
  Object.defineProperty(pdfWorker, "_setupFakeWorkerGlobal", {
    value: Promise.resolve(WorkerMessageHandler),
    configurable: true,
    writable: true,
  });
}

installPdfjsMainThreadWorker();

export { pdfjsLib };
export { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
