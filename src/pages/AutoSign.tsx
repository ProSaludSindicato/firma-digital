import { useState, useEffect } from "react";
import { Download, AlertTriangle, CheckCircle, FileText, Eye } from "lucide-react";
import { Header } from "@/components/Header";
import { AutoSignatureUploader } from "@/components/AutoSignatureUploader";
import { PDFPreview } from "@/components/PDFPreview";
import { Button } from "@/components/ui/button";
import { useAutoPDFSigner } from "@/hooks/useAutoPDFSigner";
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

  const handleProcessPDF = () => {
    if (!canProcess) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmProcess = async () => {
    try {
      // Procesar y generar URL para previsualización
      await processAndPreviewPDF();
      setIsProcessed(true);
      setShowConfirmDialog(false);

      toast({
        title: "✓ PDF procesado exitosamente",
        description: "El documento con la firma ha sido generado. Puedes previsualizarlo o descargarlo.",
        className: "bg-green-500 text-white border-green-600",
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header
        showFinishButton={canProcess}
        onFinish={handleProcessPDF}
        isProcessing={isProcessing}
        isSent={isProcessed}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {!pdfFile || !signatureImage ? (
          <div className="flex-1 flex flex-col items-center p-4 sm:p-6 min-h-full">
            {/* Header */}
            <div className="text-center max-w-2xl space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Firma Automática de Documentos
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
                Carga un documento PDF y una imagen de firma para agregarla automáticamente en la
                posición especificada. Ideal para firmas institucionales.
              </p>
            </div>

            {/* Upload Section */}
            <div className="w-full max-w-4xl">
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

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full mt-6 mb-6">
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1 text-center">Carga PDF</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Selecciona el documento
                </p>
              </div>

              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1 text-center">Configura</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Define posición y tamaño
                </p>
              </div>

              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1 text-center">Procesa</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Descarga el PDF firmado
                </p>
              </div>
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
                  {signatureConfig && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Firma configurada:</strong> Página {signatureConfig.page}, Posición
                      ({signatureConfig.x.toFixed(1)}, {signatureConfig.y.toFixed(1)}), Tamaño{" "}
                      {signatureConfig.width.toFixed(1)} x {signatureConfig.height.toFixed(1)} puntos
                    </p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="sticky bottom-0 bg-background border-t pt-4 pb-4 mt-6">
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
                  <div className="flex flex-col items-center gap-2">
                    {!canProcess && (
                      <p className="text-xs text-muted-foreground text-center">
                        {!pdfFile
                          ? "Carga un documento PDF"
                          : !signatureImage
                            ? "Carga una imagen de firma"
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
                      {isProcessing ? "Procesando..." : "Procesar y Descargar PDF"}
                    </Button>
                  </div>
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
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar procesamiento del PDF
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Se agregará la firma al documento en la posición especificada. Una vez procesado, podrás previsualizar o descargar el PDF firmado.
            </AlertDialogDescription>
            {signatureConfig && (
              <div className="text-sm text-muted-foreground space-y-1 px-1">
                <p>
                  <strong>Página:</strong> {signatureConfig.page}
                  {totalPages > 0 && ` (de ${totalPages})`}
                </p>
                <p>
                  <strong>Posición:</strong> X: {signatureConfig.x.toFixed(1)}, Y:{" "}
                  {signatureConfig.y.toFixed(1)} puntos
                </p>
                <p>
                  <strong>Tamaño:</strong> {signatureConfig.width.toFixed(1)} x{" "}
                  {signatureConfig.height.toFixed(1)} puntos
                </p>
              </div>
            )}
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

