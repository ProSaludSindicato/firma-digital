import { PDFDocument } from "pdf-lib";

type PdfLoadInput = string | Uint8Array | ArrayBuffer;

/**
 * Loads a PDF for editing/export. ProSalud convenios may arrive password-protected
 * (e.g. WordToPdf PROTECT_PDF); pdf-lib requires ignoreEncryption to modify them.
 */
export async function loadPdfDocument(data: PdfLoadInput): Promise<PDFDocument> {
  return PDFDocument.load(data, { ignoreEncryption: true });
}
