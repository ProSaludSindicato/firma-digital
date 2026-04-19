import { useState, useEffect } from "react";
import { Download, CheckCircle, Eye } from "lucide-react";
import { Header } from "@/components/Header";
import { AutoSignatureUploader } from "@/components/AutoSignatureUploader";
import { PDFPreview } from "@/components/PDFPreview";
import { Button } from "@/components/ui/button";
import { useAutoPDFSigner } from "@/hooks/useAutoPDFSigner";
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

const AutoSign = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const {
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
    processAndPreviewPDF,
    downloadProcessedPDF,
    cleanupProcessedPDF,
  } = useAutoPDFSigner();

  const { trackEvent, getAuditLog } = useAuditTrail();

  const handleProcessPDF = () => {
    if (!canProcess) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmProcess = async () => {
    try {
      trackEvent("document_submitted", { fileName: pdfFile?.name });
      await processAndPreviewPDF();
      setIsProcessed(true);
      setShowConfirmDialog(false);
      trackEvent("document_confirmed");

      const auditLog = getAuditLog();
      console.log("[AuditTrail] Auto-sign completed:", JSON.stringify(auditLog, null, 2));

      toast({
        title: "PDF procesado",
        description: "El documento con la firma ha sido generado. Puedes previsualizarlo o descargarlo.",
        className: "bg-green-600 text-white border-green-700",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al procesar el PDF";

      toast({
        title: "Error al procesar el PDF",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePreview = async () => {
    if (processedPDFUrl) {
      setShowPreview(true);
    } else {
      // Si no hay URL procesada, procesar primero
      try {
        await processAndPreviewPDF();
        setShowPreview(true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al procesar el PDF";

        toast({
          title: "Error al procesar el PDF",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  // Limpiar URL cuando el componente se desmonte
  useEffect(() => {
    return () => {
      cleanupProcessedPDF();
    };
  }, [cleanupProcessedPDF]);

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <Header
        showFinishButton={canProcess}
        onFinish={handleProcessPDF}
        isProcessing={isProcessing}
        isSent={isProcessed}
        title={appConfig.autoSignHeaderTitle}
      />

      <main className="flex-1 overflow-y-auto">
        {!pdfFile || !signatureImage ? (
          <div className="min-h-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Firma automática con imagen
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Carga un PDF institucional y una imagen de firma para insertarla automáticamente en la página y posición configuradas.
              </p>
            </div>

            <div className="w-full">
              <AutoSignatureUploader
                onPDFSelect={handlePDFSelect}
                onSignatureImageSelect={handleSignatureImageSelect}
                onConfigChange={handleConfigChange}
                pdfFile={pdfFile}
                signatureImage={signatureImage}
                signatureConfig={signatureConfig}
                onTotalPagesChange={setTotalPages}
              />
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground/70">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">1</span>
                Carga el PDF
              </span>
              <div className="w-4 sm:w-6 h-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">2</span>
                Imagen de firma
              </span>
              <div className="w-4 sm:w-6 h-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">3</span>
                Configura y procesa
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              <AutoSignatureUploader
                onPDFSelect={handlePDFSelect}
                onSignatureImageSelect={handleSignatureImageSelect}
                onConfigChange={handleConfigChange}
                pdfFile={pdfFile}
                signatureImage={signatureImage}
                signatureConfig={signatureConfig}
                onTotalPagesChange={setTotalPages}
              />

              {totalPages > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Documento:</strong> {pdfFile?.name} ({totalPages} página
                    {totalPages !== 1 ? "s" : ""})
                  </p>
                </div>
              )}

              {/* Action Button / Progress */}
              <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/60 pt-4 pb-4 mt-6">
                {isProcessed ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">¡PDF procesado correctamente!</span>
                    </div>
                    <div className="flex gap-2 w-full max-w-md">
                      <Button
                        onClick={handlePreview}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Previsualizar
                      </Button>
                      <Button
                        onClick={downloadProcessedPDF}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 w-full max-w-lg mx-auto mb-2">
                      <div className="flex items-center gap-1 flex-1">
                        {[
                          !!pdfFile,
                          !!signatureImage,
                          !!signatureConfig,
                        ].map((done, idx) => (
                          <div
                            key={idx}
                            className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                              done ? "bg-primary" : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                        {[
                          !!pdfFile,
                          !!signatureImage,
                          !!signatureConfig,
                        ].filter(Boolean).length} de 3
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      {!canProcess && (
                        <p className="text-xs text-muted-foreground text-center">
                          {!pdfFile
                            ? "Carga un documento PDF para continuar"
                            : !signatureImage
                              ? "Carga una imagen de firma para continuar"
                              : !signatureConfig
                                ? "Configura la posición de la firma"
                                : "Completa todos los campos para continuar"}
                        </p>
                      )}
                      <Button
                        onClick={handleProcessPDF}
                        disabled={!canProcess || isProcessing}
                        className="w-full max-w-md"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {isProcessing ? "Procesando..." : "Procesar y descargar PDF"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar procesamiento del PDF
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3 text-sm text-muted-foreground">
                <p>
                  Se agregará la firma al documento en la posición configurada. Después podrás previsualizar y
                  descargar el PDF firmado.
                </p>
                {signatureConfig && (
                  <div className="text-sm text-muted-foreground space-y-1 px-1">
                    <p>
                      <strong>Página:</strong> {signatureConfig.page}
                      {totalPages > 0 && ` (de ${totalPages})`}
                    </p>
                    <p>
                      <strong>Posición:</strong> X: {signatureConfig.x.toFixed(1)}, Y: {signatureConfig.y.toFixed(1)}{" "}
                      puntos
                    </p>
                    <p>
                      <strong>Tamaño:</strong> {signatureConfig.width.toFixed(1)} x {signatureConfig.height.toFixed(1)}{" "}
                      puntos
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmProcess}>
              Confirmar y Procesar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Modal */}
      {showPreview && processedPDFUrl && (
        <PDFPreview
          pdfUrl={processedPDFUrl}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default AutoSign;

