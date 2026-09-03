import { useCallback, useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

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
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let loadedPdf: pdfjsLib.PDFDocumentProxy | null = null;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
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
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
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
