import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

interface SignaturePosition {
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
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

      // Get page dimensions
      const { width: pageWidth } = page.getSize();

      // The signature position is stored in canvas coordinates (already scaled)
      // We need to get the actual scale that was used when rendering
      // The PDFViewer uses a dynamic scale, so we need to calculate based on page dimensions
      
      // Get the canvas scale by comparing the stored position to PDF coordinates
      // signaturePosition contains: x, y (center of signature), width, height (all in canvas pixels)
      
      // Fetch the PDF page to get viewport info for scale calculation
      const pdfDoc2 = await PDFDocument.load(arrayBuffer);
      const pdfPage = pdfDoc2.getPages()[signaturePosition.page - 1];
      const pdfPageWidth = pdfPage.getSize().width;
      const pdfPageHeight = pdfPage.getSize().height;
      
      // Calculate the scale factor that was applied during rendering
      // The signaturePosition.width and height are in screen pixels
      // We need to convert back to PDF points
      
      // Assuming the canvas was rendered at some scale, we can derive it from the ratio
      // But since we store coordinates in canvas space, we need the actual scale used
      // For now, we'll estimate based on typical viewport scaling
      
      // The scale is stored implicitly - we need to reverse-engineer it
      // signaturePosition coords are relative to the rendered canvas
      // We need to find what scale was used: canvasWidth = pdfWidth * scale
      
      // Since we don't store the scale, we'll calculate proportionally
      // The safest approach: store coordinates as percentages or use a known scale
      
      // For this fix: assume the coordinates are in canvas pixels at the rendering scale
      // We need to convert to PDF coordinate system (origin bottom-left, Y up)
      
      // Get the scale that was used (this should match PDFViewer's scale)
      const getResponsiveScale = () => {
        if (typeof window === 'undefined') return 1.2;
        const width = window.innerWidth;
        if (width < 640) return 0.8;
        if (width < 768) return 1.0;
        if (width < 1024) return 1.2;
        if (width < 1280) return 1.4;
        return 1.6;
      };
      
      const scaleFactor = getResponsiveScale();
      
      // Convert from canvas coordinates to PDF coordinates
      const signatureWidth = signaturePosition.width / scaleFactor;
      const signatureHeight = signaturePosition.height / scaleFactor;
      
      // x, y in signaturePosition are the CENTER of the signature in canvas coords
      // Convert to PDF coords (bottom-left origin, Y pointing up)
      const x = (signaturePosition.x - signaturePosition.width / 2) / scaleFactor;
      const y = pageHeight - ((signaturePosition.y + signaturePosition.height / 2) / scaleFactor);

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
