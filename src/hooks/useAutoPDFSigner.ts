import { useState, useCallback, useEffect } from "react";
import firmaDefault from "@/firma_default.png";
import { signPDFWithImage, signedFileName } from "@/lib/pdfSigningUtils";

export interface AutoSignatureConfig {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useAutoPDFSigner = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signatureConfig, setSignatureConfig] = useState<AutoSignatureConfig | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPDFUrl, setProcessedPDFUrl] = useState<string | null>(null);
  const [isLoadingDefaultImage, setIsLoadingDefaultImage] = useState(true);

  useEffect(() => {
    const loadDefaultSignature = async () => {
      try {
        const response = await fetch(firmaDefault);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setSignatureImage(reader.result as string);
          setIsLoadingDefaultImage(false);
        };
        reader.onerror = () => setIsLoadingDefaultImage(false);
        reader.readAsDataURL(blob);
      } catch {
        setIsLoadingDefaultImage(false);
      }
    };
    loadDefaultSignature();
  }, []);

  const handlePDFSelect = useCallback(
    (file: File | null) => {
      if (processedPDFUrl) {
        URL.revokeObjectURL(processedPDFUrl);
        setProcessedPDFUrl(null);
      }
      setPdfFile(file);
      if (!file) setSignatureConfig(null);
    },
    [processedPDFUrl],
  );

  const handleSignatureImageSelect = useCallback((imageDataUrl: string) => {
    setSignatureImage(imageDataUrl === "" ? null : imageDataUrl);
  }, []);

  const handleConfigChange = useCallback((config: AutoSignatureConfig) => {
    setSignatureConfig(config);
  }, []);

  const processPDFWithSignature = useCallback(async () => {
    if (!pdfFile || !signatureImage || !signatureConfig) {
      throw new Error("Faltan datos requeridos: PDF, imagen de firma o configuración");
    }
    setIsProcessing(true);
    try {
      return await signPDFWithImage(pdfFile, signatureImage, signatureConfig);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido al procesar el PDF";
      throw new Error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfFile, signatureImage, signatureConfig]);

  const processAndPreviewPDF = useCallback(async () => {
    if (processedPDFUrl) {
      URL.revokeObjectURL(processedPDFUrl);
      setProcessedPDFUrl(null);
    }
    const blob = await processPDFWithSignature();
    const url = URL.createObjectURL(blob);
    setProcessedPDFUrl(url);
    return url;
  }, [processPDFWithSignature, processedPDFUrl]);

  const downloadProcessedPDF = useCallback(async () => {
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
    link.download = signedFileName(pdfFile?.name ?? "documento.pdf");
    link.click();
    URL.revokeObjectURL(url);
  }, [processPDFWithSignature, pdfFile, processedPDFUrl]);

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
    isLoadingDefaultImage,
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
