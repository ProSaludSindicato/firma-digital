/**
 * Node.js-compatible port of pdfSigningUtils.ts.
 *
 * Accepts Buffer for both the PDF and the signature image instead of File / data URL.
 */

import { PDFDocument } from 'pdf-lib';

export interface SignatureConfig {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Embeds a signature image into a PDF at the given position.
 *
 * @param pdfBuffer        Raw PDF bytes
 * @param signatureBuffer  Raw image bytes (PNG or JPEG)
 * @param isPng            true = PNG, false = JPEG
 * @param config           Position / size configuration
 * @returns                Signed PDF as Buffer
 */
export async function signPDFWithBuffer(
  pdfBuffer: Buffer,
  signatureBuffer: Buffer,
  isPng: boolean,
  config: SignatureConfig,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  if (config.page < 1 || config.page > pages.length) {
    throw new Error(
      `La página ${config.page} no existe. El documento tiene ${pages.length} página(s).`,
    );
  }

  const targetPage = pages[config.page - 1];
  const { width: pageWidth, height: pageHeight } = targetPage.getSize();

  if (
    config.x < 0 ||
    config.y < 0 ||
    config.x + config.width > pageWidth ||
    config.y + config.height > pageHeight
  ) {
    throw new Error(
      `La posición o tamaño de la firma está fuera de los límites de la página. ` +
        `Dimensiones: ${pageWidth.toFixed(2)} x ${pageHeight.toFixed(2)} puntos.`,
    );
  }

  const embeddedImage = isPng
    ? await pdfDoc.embedPng(signatureBuffer)
    : await pdfDoc.embedJpg(signatureBuffer);

  targetPage.drawImage(embeddedImage, {
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
