import {
  installPdfjsMainThreadWorker,
  pdfjsLib,
} from "@/lib/pdfjsSetup";
import { copyPdfBytes } from "@/lib/convenioPdfLoad";
import { isPdfjsFakeWorkerError } from "@/lib/pdfjsWorkerSrc";

async function getDocumentFromBytes(
  data: ArrayBuffer,
): Promise<pdfjsLib.PDFDocumentProxy> {
  installPdfjsMainThreadWorker();
  return pdfjsLib.getDocument({
    data: copyPdfBytes(data),
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  }).promise;
}

export async function loadPdfjsDocumentFromBytes(
  data: ArrayBuffer,
): Promise<pdfjsLib.PDFDocumentProxy> {
  try {
    return await getDocumentFromBytes(data);
  } catch (firstError) {
    if (!isPdfjsFakeWorkerError(firstError)) {
      throw firstError;
    }

    installPdfjsMainThreadWorker();
    return getDocumentFromBytes(data);
  }
}
