import { installPromiseWithResolversPolyfill } from "@/lib/promiseWithResolversPolyfill";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";

installPromiseWithResolversPolyfill();

type PdfjsWorkerHost = typeof globalThis & {
  pdfjsWorker?: { WorkerMessageHandler: typeof WorkerMessageHandler };
};

const workerHost = globalThis as PdfjsWorkerHost;
workerHost.pdfjsWorker = { WorkerMessageHandler };

pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export { pdfjsLib };
export { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
