import { pdfjsLib } from "@/lib/pdfjsSetup";
import { copyPdfBytes } from "@/lib/convenioPdfLoad";

export async function loadPdfjsDocumentFromBytes(
  data: ArrayBuffer,
): Promise<pdfjsLib.PDFDocumentProxy> {
  return pdfjsLib.getDocument({
    data: copyPdfBytes(data),
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  }).promise;
}
