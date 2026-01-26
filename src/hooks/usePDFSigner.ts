import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

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

  const downloadSignedPDF = useCallback(async () => {
    if (!pdfFile || !signature || !signaturePosition) return;

    setIsDownloading(true);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const page = pages[signaturePosition.page - 1];

      // Get page dimensions
      const { height: pageHeight } = page.getSize();

      // Convert signature data URL to image
      const signatureImageBytes = await fetch(signature).then((res) =>
        res.arrayBuffer()
      );

      let signatureImage;
      if (signature.includes("image/png")) {
        signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      } else {
        signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
      }

      // Use the stored scale factor from when the signature was positioned
      const scaleFactor = signaturePosition.scale;
      
      // Convert from canvas coordinates to PDF coordinates
      const signatureWidth = signaturePosition.width / scaleFactor;
      const signatureHeight = signaturePosition.height / scaleFactor;
      
      // x, y in signaturePosition are the CENTER of the signature box in canvas coords
      // The visual signature inside the box has padding (p-1 = 4px) and border (2px) = 6px offset
      // This makes the actual signature content appear higher than the box center
      const visualPaddingOffset = 6; // pixels in canvas coordinates
      
      // Convert to PDF coords (bottom-left origin, Y pointing up)
      // pdf-lib drawImage uses bottom-left corner as reference point
      const x = (signaturePosition.x - signaturePosition.width / 2) / scaleFactor;
      // Center Y in PDF = pageHeight - (canvas center Y / scaleFactor)
      // Bottom-left Y for drawImage = PDF center Y - (signatureHeight / 2)
      // Add padding offset to move signature UP (higher Y in PDF = higher on page)
      const y = pageHeight - (signaturePosition.y / scaleFactor) - (signatureHeight / 2) + (visualPaddingOffset / scaleFactor);

      page.drawImage(signatureImage, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `signed_${pdfFile.name}`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al firmar el PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [pdfFile, signature, signaturePosition]);

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
  };
};
