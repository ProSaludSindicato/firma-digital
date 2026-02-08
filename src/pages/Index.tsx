import { useState, useRef } from "react";
import { Download, Send, AlertTriangle, CheckCircle, FileText, Upload, PenLine } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer, PDFViewerRef } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { usePDFSigner } from "@/hooks/usePDFSigner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
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

const Index = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const pdfViewerRef = useRef<PDFViewerRef>(null);

  const {
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
  } = usePDFSigner();

  const handleFinishAndSend = () => {
    if (!signature) {
      // Si no hay firma, activar modo de colocación
      pdfViewerRef.current?.activatePlacementMode();
    } else {
      // Si hay firma, mostrar diálogo de confirmación
      setShowConfirmDialog(true);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: 's',
        ctrlKey: true,
        metaKey: true,
        handler: async () => {
          if (!isDownloading && !isSent) {
            handleFinishAndSend();
          } else if (isSent && !isDownloading) {
            try {
              await downloadSignedPDF();
            } catch (error) {
              // Error handling is done in downloadSignedPDF
            }
          }
        },
        description: 'Ingresar firma / Finalizar y enviar / Descargar',
      },
    ],
    !!pdfFile
  );

  const handleConfirmSend = async () => {
    try {
      // TODO: Implementar lógica de envío real al backend
      console.log("Convenio enviado");

      // Simular envío exitoso
      setIsSent(true);
      setShowConfirmDialog(false);

      // Mostrar toast de éxito con estilo verde
      toast({
        title: "✓ Convenio enviado exitosamente",
        description: "Su convenio firmado ha sido recibido correctamente. Se descargará automáticamente.",
        className: "bg-green-500 text-white border-green-600",
      });

      // Descargar automáticamente el PDF
      setTimeout(async () => {
        try {
          await downloadSignedPDF();
        } catch (downloadError) {
          const errorMessage = downloadError instanceof Error 
            ? downloadError.message 
            : "Error al descargar el PDF";
          
          toast({
            title: "Error al descargar",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }, 500);
    } catch (error) {
      console.error("Error al enviar el convenio:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Hubo un problema al enviar su convenio. Por favor, intente nuevamente.";
      
      toast({
        title: "Error al enviar el convenio",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header
        showFinishButton={!!signature && !!signaturePosition}
        onFinish={handleFinishAndSend}
        isProcessing={isDownloading}
        isSent={isSent}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!pdfFile ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0">
            {/* Compact Header */}
            <div className="text-center max-w-2xl space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 flex-shrink-0">
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Firma tus documentos PDF
              </h1>
              
              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
                Sube tu documento, haz clic donde deseas firmar, y descarga el PDF firmado listo para enviar.
              </p>
            </div>

            {/* Upload Section - Main Focus */}
            <div className="w-full max-w-3xl flex-shrink-0 mb-4 sm:mb-6">
              <PDFUploader onFileSelect={handleFileSelect} />
            </div>

            {/* Compact Features */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xl w-full flex-shrink-0">
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all hover:shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1 text-center">Fácil</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  Arrastra y suelta
                </p>
              </div>
              
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all hover:shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1 text-center">Firma</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  Dibuja o sube
                </p>
              </div>
              
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all hover:shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm mb-1 text-center">Descarga</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  PDF listo
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* PDF Viewer - full width on mobile */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <PDFViewer
                ref={pdfViewerRef}
                file={pdfFile}
                signature={signature}
                signaturePosition={signaturePosition}
                onSignaturePositionChange={setSignaturePosition}
                onSignatureCreate={handleSignatureCreate}
                onClearSignature={handleClearSignature}
                totalPages={totalPages}
                onTotalPagesChange={setTotalPages}
                isLocked={isSent}
              />
            </div>

            {/* Spacer for fixed bottom bar on mobile */}
            <div className="flex-shrink-0 h-24 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />

            {/* Bottom action bar - fixed on mobile, static on desktop */}
            <div
              className="fixed bottom-0 left-0 right-0 md:relative p-3 md:p-4 bg-background border-t border-border z-50"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              {isSent ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">¡Convenio enviado correctamente!</span>
                  </div>
                  <Button onClick={downloadSignedPDF} disabled={isDownloading} className="w-full max-w-md">
                    <Download className="w-4 h-4 mr-2" />
                    {isDownloading ? "Procesando..." : "Descargar PDF firmado"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {!signature && pdfFile && (
                    <p className="text-xs text-muted-foreground text-center">
                      Haz clic en "Ingresar firma" y luego en el documento donde deseas colocar tu firma
                    </p>
                  )}
                  {signature && !canDownload && pdfFile && (
                    <p className="text-xs text-muted-foreground text-center">
                      Ajuste la posición de la firma si es necesario
                    </p>
                  )}
                  <Button
                    onClick={handleFinishAndSend}
                    disabled={isDownloading}
                    className="w-full max-w-md"
                  >
                    {signature ? (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {isDownloading ? "Procesando..." : "Finalizar y Enviar Convenio"}
                      </>
                    ) : (
                      <>
                        <PenLine className="w-4 h-4 mr-2" />
                        Ingresar firma
                      </>
                    )}
                  </Button>
                </div>
              )}
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
              Confirmar envío del convenio
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                <strong>Al confirmar, la firma quedará integrada al documento y no podrá modificarse.</strong>
              </p>
              <p className="text-muted-foreground">
                Asegúrese de que la firma esté correctamente ubicada antes de continuar. Una vez enviado, podrá
                descargar una copia del documento firmado.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Confirmar y Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
