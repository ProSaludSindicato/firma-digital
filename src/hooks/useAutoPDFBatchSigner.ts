import { useState, useCallback } from "react";
import JSZip from "jszip";
import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";
import { signPDFWithImage, signedFileName } from "@/lib/pdfSigningUtils";
import {
  createSignatureLocationProvider,
  calculateSignaturePosition,
} from "@/lib/signatureLocationService";
import {
  DEFAULT_AUTO_SIGN_CONFIG,
  AI_SEARCH_CONFIG,
} from "@/lib/autoSignConfig";

// ─── Types ────────────────────────────────────────────────────

export type BatchItemStatus =
  | "pending"
  | "detecting"
  | "signing"
  | "done"
  | "error";

export interface BatchItemResult {
  file: File;
  status: BatchItemStatus;
  signedBlob?: Blob;
  config?: AutoSignatureConfig;
  error?: string;
}

// ─── Concurrency helper ────────────────────────────────────────

/**
 * Procesa un array de tareas asíncronas con un límite de concurrencia.
 */
async function pooled<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onSettled?: (index: number, result: PromiseSettledResult<T>) => void,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIdx = 0;

  const worker = async () => {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: "fulfilled", value };
        onSettled?.(idx, results[idx]);
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
        onSettled?.(idx, results[idx]);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ─── Hook ─────────────────────────────────────────────────────

export const useAutoPDFBatchSigner = () => {
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const setItemStatus = useCallback(
    (index: number, patch: Partial<BatchItemResult>) => {
      setResults((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...patch };
        return next;
      });
    },
    [],
  );

  /**
   * Inicializa la cola de archivos (sin procesar todavía).
   */
  const setFiles = useCallback((files: File[]) => {
    setResults(
      files.map((file) => ({ file, status: "pending" as BatchItemStatus })),
    );
    setDoneCount(0);
  }, []);

  /**
   * Limpia todos los archivos y resultados.
   */
  const clearFiles = useCallback(() => {
    setResults([]);
    setDoneCount(0);
  }, []);

  /**
   * Procesa todos los archivos en paralelo (máx. 3 a la vez).
   * Para cada archivo:
   *  1. Detecta la posición de firma con pdfjs-dist (o usa defaults).
   *  2. Firma el PDF con pdf-lib.
   * Actualiza el estado de cada item en tiempo real.
   */
  const processAll = useCallback(
    async (signatureImage: string) => {
      if (results.length === 0 || isProcessing) return;

      setIsProcessing(true);
      setDoneCount(0);

      const provider = createSignatureLocationProvider();

      const tasks = results.map((item, index) => async () => {
        // ── 1. Detectar posición ──────────────────────────────
        setItemStatus(index, { status: "detecting" });
        const textLocation = await provider.findTextInPDF({
          pdfFile: item.file,
          searchText: AI_SEARCH_CONFIG.searchText,
          pageNumber: AI_SEARCH_CONFIG.defaultSearchPage,
        });
        if (!textLocation) {
          throw new Error(
            "No se pudo detectar la posición de firma en este documento.",
          );
        }
        const pos = calculateSignaturePosition(
          textLocation,
          AI_SEARCH_CONFIG.offsetX,
          AI_SEARCH_CONFIG.offsetY,
        );
        const config: AutoSignatureConfig = {
          page: pos.page,
          x: pos.x,
          y: pos.y,
          width: DEFAULT_AUTO_SIGN_CONFIG.width,
          height: DEFAULT_AUTO_SIGN_CONFIG.height,
        };

        // ── 2. Firmar ─────────────────────────────────────────
        setItemStatus(index, { status: "signing", config });
        const signedBlob = await signPDFWithImage(item.file, signatureImage, config);

        setItemStatus(index, { status: "done", signedBlob, config });
        setDoneCount((n) => n + 1);
      });

      await pooled(tasks, 3, (index, settled) => {
        if (settled.status === "rejected") {
          const reason = settled.reason;
          const errorMsg =
            reason instanceof Error ? reason.message : "Error desconocido";
          setItemStatus(index, { status: "error", error: errorMsg });
          setDoneCount((n) => n + 1);
        }
      });

      setIsProcessing(false);
    },
    [results, isProcessing, setItemStatus],
  );

  /**
   * Descarga todos los PDFs firmados exitosamente en un archivo ZIP.
   */
  const downloadAsZip = useCallback(async () => {
    const zip = new JSZip();

    const signed = results.filter((r) => r.status === "done" && r.signedBlob);
    if (signed.length === 0) return;

    for (const item of signed) {
      zip.file(signedFileName(item.file.name), item.signedBlob!);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "convenios_firmados.zip";
    link.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const successCount = results.filter((r) => r.status === "done").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const totalCount = results.length;
  const isAllDone =
    totalCount > 0 &&
    results.every((r) => r.status === "done" || r.status === "error");
  const canProcess =
    results.length > 0 && !isProcessing && !isAllDone;

  return {
    results,
    isProcessing,
    doneCount,
    successCount,
    errorCount,
    totalCount,
    isAllDone,
    canProcess,
    setFiles,
    clearFiles,
    processAll,
    downloadAsZip,
  };
};
