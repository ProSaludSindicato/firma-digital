import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

interface SignaturePosition {
  x: number;
  y: number;
  page: number;
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

      // Scale factor based on PDF rendering scale (1.2 in PDFViewer)
      const scaleFactor = 1.2;

      // Calculate position - flip Y coordinate for PDF coordinate system
      const signatureWidth = 150 / scaleFactor;
      const signatureHeight =
        (signatureImage.height / signatureImage.width) * signatureWidth;

      const x = (signaturePosition.x - 75) / scaleFactor;
      const y =
        pageHeight - (signaturePosition.y - 25) / scaleFactor - signatureHeight;

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
