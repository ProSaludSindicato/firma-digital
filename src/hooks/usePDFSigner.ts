import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { pdfSignatureConfig } from "@/lib/pdfSignatureConfig";

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

      // ── Coordinate mapping: viewer → PDF ─────────────────────────────────
      //
      // The signature box in PDFPageView is an absolutely-positioned div with:
      //   className="border-2 p-1 ..."   ← border: 2px, padding: 4px each side
      //   style={{ left: cx - w/2, top: cy - h/2, width: w }}
      //
      // With Tailwind's border-box sizing:
      //   Content area left  = box.left  + border(2) + padding(4) = box.left  + 6
      //   Content area top   = box.top   + border(2) + padding(4) = box.top   + 6
      //   Content area width = w - 2×(border+padding) = w - 12
      //
      // The <img> inside: width:100% (= content area), height:auto, maxHeight: h-8
      //   drawWidth  = w - 12                                (always fills content)
      //   drawHeight = min(drawWidth / imageAR, h - 8)       (capped, not shrinking width)
      //
      // All stored coords are CSS px at signaturePosition.scale (= storedScale).
      // PDF points = CSS px / storedScale.
      // ─────────────────────────────────────────────────────────────────────

      const storedScale = signaturePosition.scale;
      const BOX_INSET = 6; // px – border(2) + padding(4), each side

      // Image dimensions in CSS px at storedScale → PDF points
      const imgWidthPx  = signaturePosition.width  - 2 * BOX_INSET;
      const maxImgHPx   = signaturePosition.height - 8;            // matches viewer's `adjustedHeight - 8`

      const imgWidthPt  = Math.max(1, imgWidthPx  / storedScale);
      const maxImgHPt   = Math.max(1, maxImgHPx   / storedScale);

      const nat = signatureImage.scale(1);
      const AR  = nat.height > 0 ? nat.width / nat.height : 1;

      // Width always equals content area (like width:100% in viewer).
      // Height is capped at maxHeight without reducing the width (like height:auto + maxHeight in viewer).
      const drawWidth  = imgWidthPt;
      const drawHeight = Math.min(imgWidthPt / AR, maxImgHPt);

      // Image top-left in CSS px at storedScale → PDF points
      const imgLeftPx = signaturePosition.x - signaturePosition.width  / 2 + BOX_INSET;
      const imgTopPx  = signaturePosition.y - signaturePosition.height / 2 + BOX_INSET;

      const imgLeftPt = imgLeftPx / storedScale;
      const imgTopPt  = imgTopPx  / storedScale;

      // PDF coordinate system: origin at bottom-left, Y pointing up.
      // pdf-lib drawImage anchors at the bottom-left corner of the image.
      const x = imgLeftPt + pdfSignatureConfig.exportOffsetX;
      const y = pageHeight - imgTopPt - drawHeight + pdfSignatureConfig.exportOffsetY;

      page.drawImage(signatureImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
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
      
      // Provide more descriptive error messages
      let errorMessage = "Error desconocido al procesar el PDF";
      
      if (error instanceof Error) {
        if (error.message.includes("corrupt") || error.message.includes("invalid")) {
          errorMessage = "El archivo PDF está corrupto o no es válido. Por favor, verifica el archivo.";
        } else if (error.message.includes("memory") || error.message.includes("size")) {
          errorMessage = "El archivo PDF es demasiado grande para procesar. Intenta con un archivo más pequeño.";
        } else {
          errorMessage = `Error al procesar el PDF: ${error.message}`;
        }
      }
      
      // Re-throw with better message for UI handling
      throw new Error(errorMessage);
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
