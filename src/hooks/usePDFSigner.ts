import { useState, useCallback } from "react";
import { pdfSignatureConfig } from "@/lib/pdfSignatureConfig";
import { loadPdfDocument } from "@/lib/loadPdfDocument";

interface SignaturePosition {
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  scale: number;
}

export const usePDFSigner = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signaturePosition, setSignaturePosition] =
    useState<SignaturePosition | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setPdfFile(file);
    setSignature(null);
    setSignaturePosition(null);
  }, []);

  const handleSignatureCreate = useCallback((sig: string) => {
    setSignature(sig);
    setSignaturePosition(null);
  }, []);

  const handleClearSignature = useCallback(() => {
    setSignature(null);
    setSignaturePosition(null);
  }, []);

  const buildSignedPdfBlob = useCallback(async (): Promise<Blob> => {
    if (!pdfFile || !signature || !signaturePosition) {
      throw new Error("Falta el PDF, la firma o la posición de la firma.");
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await loadPdfDocument(arrayBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[signaturePosition.page - 1];

    const { height: pageHeight } = page.getSize();

    const signatureImageBytes = await fetch(signature).then((res) =>
      res.arrayBuffer()
    );

    let signatureImage;
    if (signature.includes("image/png")) {
      signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    } else {
      signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
    }

    const storedScale = signaturePosition.scale;
    const BOX_INSET = 6;

    const imgWidthPx = signaturePosition.width - 2 * BOX_INSET;
    const maxImgHPx = signaturePosition.height - 8;

    const imgWidthPt = Math.max(1, imgWidthPx / storedScale);
    const maxImgHPt = Math.max(1, maxImgHPx / storedScale);

    const nat = signatureImage.scale(1);
    const AR = nat.height > 0 ? nat.width / nat.height : 1;

    const drawWidth = imgWidthPt;
    const drawHeight = Math.min(imgWidthPt / AR, maxImgHPt);

    const imgLeftPx =
      signaturePosition.x - signaturePosition.width / 2 + BOX_INSET;
    const imgTopPx =
      signaturePosition.y - signaturePosition.height / 2 + BOX_INSET;

    const imgLeftPt = imgLeftPx / storedScale;
    const imgTopPt = imgTopPx / storedScale;

    const x = imgLeftPt + pdfSignatureConfig.exportOffsetX;
    const y =
      pageHeight - imgTopPt - drawHeight + pdfSignatureConfig.exportOffsetY;

    page.drawImage(signatureImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    const pdfBytes = await pdfDoc.save();

    return new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });
  }, [pdfFile, signature, signaturePosition]);

  const downloadSignedPDF = useCallback(async () => {
    if (!pdfFile || !signature || !signaturePosition) return;

    setIsDownloading(true);

    try {
      const blob = await buildSignedPdfBlob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `signed_${pdfFile.name}`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al firmar el PDF:", error);

      let errorMessage = "Error desconocido al procesar el PDF";

      if (error instanceof Error) {
        if (
          error.message.includes("corrupt") ||
          error.message.includes("invalid")
        ) {
          errorMessage =
            "El archivo PDF está corrupto o no es válido. Por favor, verifica el archivo.";
        } else if (
          error.message.includes("memory") ||
          error.message.includes("size")
        ) {
          errorMessage =
            "El archivo PDF es demasiado grande para procesar. Intenta con un archivo más pequeño.";
        } else {
          errorMessage = `Error al procesar el PDF: ${error.message}`;
        }
      }

      throw new Error(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  }, [pdfFile, signature, signaturePosition, buildSignedPdfBlob]);

  const canDownload = pdfFile && signature && signaturePosition;

  return {
    pdfFile,
    signature,
    signaturePosition,
    totalPages,
    isDownloading,
    canDownload,
    handleFileSelect,
    handleSignatureCreate,
    handleClearSignature,
    setSignaturePosition,
    setTotalPages,
    downloadSignedPDF,
    buildSignedPdfBlob,
  };
};
