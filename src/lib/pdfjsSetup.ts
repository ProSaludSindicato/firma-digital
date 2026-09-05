import { installPromiseWithResolversPolyfill } from "@/lib/promiseWithResolversPolyfill";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfjsWorkerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

installPromiseWithResolversPolyfill();

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

export { pdfjsLib, pdfjsWorkerSrc };
export { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
