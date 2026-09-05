import { useCallback, useEffect, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjsSetup";
import { loadPdfjsDocumentFromBytes } from "@/lib/loadPdfjsDocument";
import { reportClientError } from "@/lib/reportClientError";

export function usePdfjsDocument(file: File | null) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setTotalPages(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let loadedPdf: pdfjsLib.PDFDocumentProxy | null = null;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await loadPdfjsDocumentFromBytes(arrayBuffer, {
          onWorkerFallback: (workerError) => {
            reportClientError(workerError, { phase: "pdf_worker_fallback" });
          },
        });
        loadedPdf = pdf;
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        const message =
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el PDF.";
        setError(message);
        setPdfDoc(null);
        setTotalPages(0);
        reportClientError(
          loadError instanceof Error ? loadError : new Error(message),
          { phase: "pdf_load" },
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (loadedPdf) {
        void loadedPdf.destroy();
      }
    };
  }, [file]);

  const reset = useCallback(() => {
    setPdfDoc(null);
    setTotalPages(0);
    setError(null);
    setIsLoading(false);
  }, []);

  return { pdfDoc, isLoading, totalPages, error, reset };
}
