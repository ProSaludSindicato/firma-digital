import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";
import { loadPdfDocument } from "@/lib/loadPdfDocument";

/**
 * Firma un archivo PDF insertando una imagen en la posición especificada.
 * Función pura: sin estado de React. Usable desde hooks individuales o batch.
 *
 * @returns Blob del PDF firmado
 */
export async function signPDFWithImage(
  pdfFile: File,
  signatureImage: string,
  config: AutoSignatureConfig,
): Promise<Blob> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await loadPdfDocument(arrayBuffer);
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

  const signatureImageBytes = await fetch(signatureImage).then((res) =>
    res.arrayBuffer(),
  );

  const embeddedImage = signatureImage.includes("image/png")
    ? await pdfDoc.embedPng(signatureImageBytes)
    : await pdfDoc.embedJpg(signatureImageBytes);

  targetPage.drawImage(embeddedImage, {
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}

/**
 * Genera el nombre de descarga de un PDF firmado a partir del nombre original.
 */
export function signedFileName(originalName: string): string {
  return originalName.replace(/\.pdf$/i, "") + "_firmado.pdf";
}
