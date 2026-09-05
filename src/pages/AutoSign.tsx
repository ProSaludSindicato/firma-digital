import { useState, useEffect, useCallback } from "react";
import {
  Download,
  CheckCircle,
  Eye,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  Archive,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AutoSignatureUploader } from "@/components/AutoSignatureUploader";
import { PDFPreview } from "@/components/PDFPreview";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAutoPDFSigner } from "@/hooks/useAutoPDFSigner";
import { useAutoPDFBatchSigner } from "@/hooks/useAutoPDFBatchSigner";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { appConfig } from "@/lib/appConfig";

// ─── Mode toggle ───────────────────────────────────────────────

type Mode = "individual" | "batch";

const AutoSign = () => {
  const [mode, setMode] = useState<Mode>("individual");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Individual state
  const [isProcessed, setIsProcessed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Batch files list (received from uploader)
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  const individual = useAutoPDFSigner();
  const batch = useAutoPDFBatchSigner();
  const { trackEvent } = useAuditTrail();

  // Keep batch hook in sync with files list from uploader
  useEffect(() => {
    batch.setFiles(batchFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFiles]);

  // Reset processed state when switching mode
  useEffect(() => {
    setIsProcessed(false);
    setBatchFiles([]);
    batch.clearFiles();
    individual.handlePDFSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Individual handlers ────────────────────────────────────

  const handleProcessPDF = () => {
    if (!individual.canProcess) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmProcess = async () => {
    try {
      trackEvent("document_submitted", { fileName: individual.pdfFile?.name });
      await individual.processAndPreviewPDF();
      setIsProcessed(true);
      setShowConfirmDialog(false);
      trackEvent("document_confirmed");
      toast({
        title: "PDF procesado",
        description: "El documento con la firma ha sido generado.",
        className: "bg-green-600 text-white border-green-700",
      });
    } catch (error) {
      toast({
        title: "Error al procesar el PDF",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async () => {
    if (individual.processedPDFUrl) {
      setShowPreview(true);
    } else {
      try {
        await individual.processAndPreviewPDF();
        setShowPreview(true);
      } catch (error) {
        toast({
          title: "Error al procesar el PDF",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    }
  };

  // ── Batch handlers ─────────────────────────────────────────

  const handleBatchProcess = () => {
    if (!batch.canProcess || !individual.signatureImage) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmBatchProcess = async () => {
    if (!individual.signatureImage) return;
    setShowConfirmDialog(false);
    try {
      trackEvent("document_submitted", { batchCount: batchFiles.length });
      await batch.processAll(individual.signatureImage);
      trackEvent("document_confirmed");
      toast({
        title: "Procesamiento completado",
        description: `${batch.successCount} documento${batch.successCount !== 1 ? "s" : ""} firmado${batch.successCount !== 1 ? "s" : ""} correctamente.`,
        className: "bg-green-600 text-white border-green-700",
      });
    } catch (error) {
      toast({
        title: "Error en el procesamiento",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  // Cleanup individual URL on unmount
  useEffect(() => {
    return () => { individual.cleanupProcessedPDF(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived state ──────────────────────────────────────────

  const isBatch = mode === "batch";
  const canConfirm = isBatch
    ? batch.canProcess && !!individual.signatureImage
    : !!individual.canProcess;

  const isHeaderProcessing = isBatch ? batch.isProcessing : individual.isProcessing;
  const isHeaderDone = isBatch ? batch.isAllDone : isProcessed;

  const progressPercent =
    batch.totalCount > 0
      ? Math.round((batch.doneCount / batch.totalCount) * 100)
      : 0;

  // ── Render ─────────────────────────────────────────────────

  const renderModeToggle = () => (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
      <button
        onClick={() => setMode("individual")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          mode === "individual"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <FileText className="w-3.5 h-3.5" />
        Individual
      </button>
      <button
        onClick={() => setMode("batch")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          mode === "batch"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        Masivo
      </button>
    </div>
  );

  const renderBatchResults = () => {
    if (!batch.isAllDone) return null;

    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium">
            {batch.successCount} exitoso{batch.successCount !== 1 ? "s" : ""
            }{batch.errorCount > 0 && `, ${batch.errorCount} con error`}
          </span>
        </div>
        {batch.results.filter((r) => r.status === "error").map((r, i) => (
          <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs text-destructive border-t bg-destructive/5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>{r.file.name}</strong>: {r.error ?? "Error desconocido"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderActionBar = () => {
    if (isBatch) {
      // ── Batch action bar ──
      if (batch.isProcessing) {
        return (
          <div className="flex flex-col gap-2 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando {batch.doneCount} de {batch.totalCount} documentos…
            </div>
            <Progress value={progressPercent} className="w-full max-w-md h-2" />
          </div>
        );
      }

      if (batch.isAllDone) {
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">
                {batch.successCount} de {batch.totalCount} documentos firmados
              </span>
            </div>
            {batch.successCount > 0 && (
              <Button onClick={batch.downloadAsZip} className="w-full max-w-md">
                <Archive className="w-4 h-4 mr-2" />
                Descargar ZIP ({batch.successCount} documento{batch.successCount !== 1 ? "s" : ""})
              </Button>
            )}
          </div>
        );
      }

      // Ready to process
      const ready = batchFiles.length > 0 && !!individual.signatureImage;
      return (
        <div className="flex flex-col items-center gap-2">
          {!ready && (
            <p className="text-xs text-muted-foreground text-center">
              {batchFiles.length === 0
                ? "Carga al menos un documento PDF para continuar"
                : "Carga una imagen de firma para continuar"}
            </p>
          )}
          <Button
            onClick={handleBatchProcess}
            disabled={!canConfirm}
            className="w-full max-w-md"
          >
            <Layers className="w-4 h-4 mr-2" />
            Firmar {batchFiles.length > 0 ? `${batchFiles.length} documento${batchFiles.length !== 1 ? "s" : ""}` : "documentos"}
          </Button>
        </div>
      );
    }

    // ── Individual action bar ──
    if (isProcessed) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">¡PDF procesado correctamente!</span>
          </div>
          <div className="flex gap-2 w-full max-w-md">
            <Button onClick={handlePreview} disabled={individual.isProcessing} variant="outline" className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              Previsualizar
            </Button>
            <Button onClick={individual.downloadProcessedPDF} disabled={individual.isProcessing} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </div>
      );
    }

    const steps = [!!individual.pdfFile, !!individual.signatureImage, !!individual.signatureConfig];
    return (
      <>
        <div className="flex items-center gap-2 w-full max-w-lg mx-auto mb-2">
          <div className="flex items-center gap-1 flex-1">
            {steps.map((done, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full flex-1 transition-all duration-300 ${done ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
            {steps.filter(Boolean).length} de 3
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          {!individual.canProcess && (
            <p className="text-xs text-muted-foreground text-center">
              {!individual.pdfFile
                ? "Carga un documento PDF para continuar"
                : !individual.signatureImage
                  ? "Carga una imagen de firma para continuar"
                  : "Detectando posición de firma…"}
            </p>
          )}
          <Button
            onClick={handleProcessPDF}
            disabled={!individual.canProcess || individual.isProcessing}
            className="w-full max-w-md"
          >
            <Download className="w-4 h-4 mr-2" />
            {individual.isProcessing ? "Procesando..." : "Procesar y descargar PDF"}
          </Button>
        </div>
      </>
    );
  };

  const hasContent = isBatch ? batchFiles.length > 0 || !!individual.signatureImage : !!individual.pdfFile || !!individual.signatureImage;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <Header
        showFinishButton={isBatch ? canConfirm && !batch.isProcessing && !batch.isAllDone : !!individual.canProcess}
        onFinish={isBatch ? handleBatchProcess : handleProcessPDF}
        isProcessing={isHeaderProcessing}
        isSent={isHeaderDone}
        title={appConfig.autoSignHeaderTitle}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">

          {/* Page header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Firma automática de documentos
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Carga uno o varios PDFs institucionales y la imagen de firma para insertarla automáticamente.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex justify-center">{renderModeToggle()}</div>

          {/* Uploader */}
          <div className="w-full">
            <AutoSignatureUploader
              onPDFSelect={individual.handlePDFSelect}
              onPDFsSelect={isBatch ? setBatchFiles : undefined}
              onSignatureImageSelect={individual.handleSignatureImageSelect}
              onConfigChange={individual.handleConfigChange}
              pdfFile={individual.pdfFile}
              signatureImage={individual.signatureImage}
              signatureConfig={individual.signatureConfig}
              onTotalPagesChange={individual.setTotalPages}
              batchMode={isBatch}
            />
          </div>

          {/* Steps hint (only when nothing loaded yet) */}
          {!hasContent && (
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground/70">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">1</span>
                {isBatch ? "Carga PDFs" : "Carga el PDF"}
              </span>
              <div className="w-4 sm:w-6 h-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">2</span>
                Imagen de firma
              </span>
              <div className="w-4 sm:w-6 h-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">3</span>
                Procesar
              </span>
            </div>
          )}

          {/* Batch results summary */}
          {isBatch && renderBatchResults()}

          {/* Action bar (sticky at bottom when content loaded) */}
          {hasContent && (
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/60 pt-4 pb-4">
              {renderActionBar()}
            </div>
          )}
        </div>
      </main>

      {/* Confirm dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar procesamiento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-1">
                {isBatch ? (
                  <p>
                    Se agregará la firma a{" "}
                    <strong>{batchFiles.length} documento{batchFiles.length !== 1 ? "s" : ""}</strong>.
                    Al finalizar podrás descargar todos en un archivo ZIP.
                  </p>
                ) : (
                  <p>
                    Se agregará la firma al documento. Después podrás previsualizar y descargarlo.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={isBatch ? handleConfirmBatchProcess : handleConfirmProcess}>
              Confirmar y procesar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Modal (individual only) */}
      {showPreview && individual.processedPDFUrl && (
        <PDFPreview pdfUrl={individual.processedPDFUrl} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};

export default AutoSign;
