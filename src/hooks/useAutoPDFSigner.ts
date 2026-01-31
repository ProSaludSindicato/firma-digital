import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

export interface AutoSignatureConfig {
  page: number; // Número de página (1-indexed)
  x: number; // Posición X en puntos PDF (0 = izquierda)
  y: number; // Posición Y en puntos PDF (0 = abajo, sistema de coordenadas PDF)
  width: number; // Ancho de la firma en puntos PDF
  height: number; // Alto de la firma en puntos PDF
}

export const useAutoPDFSigner = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signatureConfig, setSignatureConfig] = useState<AutoSignatureConfig | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPDFUrl, setProcessedPDFUrl] = useState<string | null>(null);

  const handlePDFSelect = useCallback((file: File | null) => {
    // Limpiar PDF procesado anterior si existe
    if (processedPDFUrl) {
      URL.revokeObjectURL(processedPDFUrl);
      setProcessedPDFUrl(null);
    }
    setPdfFile(file);
    if (!file) {
      setSignatureConfig(null);
    }
  }, [processedPDFUrl]);

  const handleSignatureImageSelect = useCallback((imageDataUrl: string) => {
    if (imageDataUrl === "") {
      setSignatureImage(null);
    } else {
      setSignatureImage(imageDataUrl);
    }
  }, []);

  const handleConfigChange = useCallback((config: AutoSignatureConfig) => {
    setSignatureConfig(config);
  }, []);

  /**
   * Procesa el PDF y agrega la firma automáticamente en la posición especificada
   */
  const processPDFWithSignature = useCallback(async () => {
    if (!pdfFile || !signatureImage || !signatureConfig) {
      throw new Error("Faltan datos requeridos: PDF, imagen de firma o configuración");
    }

    setIsProcessing(true);

    try {
      // Cargar el PDF
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Validar que la página existe
      if (signatureConfig.page < 1 || signatureConfig.page > pages.length) {
        throw new Error(
          `La página ${signatureConfig.page} no existe. El documento tiene ${pages.length} página(s).`
        );
      }

      // Obtener la página objetivo (convertir de 1-indexed a 0-indexed)
      const targetPage = pages[signatureConfig.page - 1];
      const { width: pageWidth, height: pageHeight } = targetPage.getSize();

      // Validar que la posición y tamaño están dentro de los límites de la página
      if (
        signatureConfig.x < 0 ||
        signatureConfig.y < 0 ||
        signatureConfig.x + signatureConfig.width > pageWidth ||
        signatureConfig.y + signatureConfig.height > pageHeight
      ) {
        throw new Error(
          `La posición o tamaño de la firma está fuera de los límites de la página. ` +
          `Dimensiones de la página: ${pageWidth.toFixed(2)} x ${pageHeight.toFixed(2)} puntos.`
        );
      }

      // Convertir la imagen de firma a bytes
      const signatureImageBytes = await fetch(signatureImage).then((res) =>
        res.arrayBuffer()
      );

      // Embed la imagen en el PDF
      let embeddedImage;
      if (signatureImage.includes("image/png")) {
        embeddedImage = await pdfDoc.embedPng(signatureImageBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(signatureImageBytes);
      }

      // Dibujar la imagen en la página
      // Nota: pdf-lib usa coordenadas con origen en la esquina inferior izquierda
      // y = 0 está en la parte inferior, y aumenta hacia arriba
      targetPage.drawImage(embeddedImage, {
        x: signatureConfig.x,
        y: signatureConfig.y,
        width: signatureConfig.width,
        height: signatureConfig.height,
      });

      // Guardar el PDF modificado
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });

      return blob;
    } catch (error) {
      console.error("Error al procesar el PDF:", error);

      let errorMessage = "Error desconocido al procesar el PDF";

      if (error instanceof Error) {
        if (error.message.includes("corrupt") || error.message.includes("invalid")) {
          errorMessage = "El archivo PDF está corrupto o no es válido. Por favor, verifica el archivo.";
        } else if (error.message.includes("memory") || error.message.includes("size")) {
          errorMessage = "El archivo PDF es demasiado grande para procesar. Intenta con un archivo más pequeño.";
        } else {
          errorMessage = error.message;
        }
      }

      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfFile, signatureImage, signatureConfig]);

  /**
   * Procesa el PDF y genera un blob URL para previsualización
   */
  const processAndPreviewPDF = useCallback(async () => {
    try {
      // Limpiar URL anterior si existe
      if (processedPDFUrl) {
        URL.revokeObjectURL(processedPDFUrl);
        setProcessedPDFUrl(null);
      }

      const blob = await processPDFWithSignature();
      const url = URL.createObjectURL(blob);
      setProcessedPDFUrl(url);
      return url;
    } catch (error) {
      // El error ya fue manejado en processPDFWithSignature
      throw error;
    }
  }, [processPDFWithSignature, processedPDFUrl]);

  /**
   * Descarga el PDF procesado con la firma
   */
  const downloadProcessedPDF = useCallback(async () => {
    try {
      // Si ya tenemos el PDF procesado, usarlo directamente
      let blob: Blob;
      if (processedPDFUrl) {
        const response = await fetch(processedPDFUrl);
        blob = await response.blob();
      } else {
        blob = await processPDFWithSignature();
      }

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const originalName = pdfFile?.name || "documento";
      const nameWithoutExt = originalName.replace(/\.pdf$/i, "");
      link.download = `${nameWithoutExt}_firmado.pdf`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      // El error ya fue manejado en processPDFWithSignature
      throw error;
    }
  }, [processPDFWithSignature, pdfFile, processedPDFUrl]);

  /**
   * Limpia el blob URL cuando el componente se desmonta o se cambia el PDF
   */
  const cleanupProcessedPDF = useCallback(() => {
    if (processedPDFUrl) {
      URL.revokeObjectURL(processedPDFUrl);
      setProcessedPDFUrl(null);
    }
  }, [processedPDFUrl]);

  const canProcess = pdfFile && signatureImage && signatureConfig && !isProcessing;

  return {
    pdfFile,
    signatureImage,
    signatureConfig,
    totalPages,
    isProcessing,
    canProcess,
    processedPDFUrl,
    handlePDFSelect,
    handleSignatureImageSelect,
    handleConfigChange,
    setTotalPages,
    processPDFWithSignature,
    processAndPreviewPDF,
    downloadProcessedPDF,
    cleanupProcessedPDF,
  };
};

