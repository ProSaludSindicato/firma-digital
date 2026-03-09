import { useState, useRef } from "react";
import { Download, Send, CheckCircle, PenLine, Check } from "lucide-react";
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
        title: "Documento enviado",
        description: "Tu documento firmado ha sido enviado correctamente. Se descargará automáticamente.",
        className: "bg-green-600 text-white border-green-700",
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
        title="Convenio de afiliación ProSalud"
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!pdfFile ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0">
            <div className="text-center max-w-2xl space-y-2 mb-6 sm:mb-8 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Firma tu documento
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sube tu PDF, coloca tu firma y descárgalo listo para enviar.
              </p>
            </div>

            <div className="w-full max-w-2xl flex-shrink-0 mb-6 sm:mb-8">
              <PDFUploader onFileSelect={handleFileSelect} />
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground/70 flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">1</span>
                Sube tu PDF
              </span>
              <div className="w-4 sm:w-6 h-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">2</span>
                Agrega tu firma
              </span>
              <div className="w-4 sm:w-6 h-px bg-border" />
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">3</span>
                Descarga
              </span>
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

            <div className="flex-shrink-0 h-[88px] md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />

            {(() => {
              const completedSteps = isSent ? 3 : signature ? 2 : 1;
              const stepLabels = [
                "Documento cargado",
                "Agrega tu firma",
                "Listo para enviar",
              ];
              return (
                <div
                  className="fixed bottom-0 left-0 right-0 md:relative bg-background/95 backdrop-blur-sm border-t border-border/60 z-50"
                  style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                >
                  <div className="flex flex-col items-center gap-2.5 px-4 py-3 md:py-4 max-w-lg mx-auto">
                    {isSent ? (
                      <>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Documento enviado correctamente
                        </div>
                        <Button onClick={downloadSignedPDF} disabled={isDownloading} className="w-full" size="lg">
                          <Download className="w-4 h-4 mr-2" />
                          {isDownloading ? "Procesando..." : "Descargar copia firmada"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex items-center gap-1 flex-1">
                            {[1, 2, 3].map((s) => (
                              <div
                                key={s}
                                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                                  s <= completedSteps ? "bg-primary" : "bg-border"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                            {isSent ? "Completado" : `${completedSteps} de 3`}
                          </span>
                        </div>

                        <Button
                          onClick={handleFinishAndSend}
                          disabled={isDownloading}
                          className="w-full"
                          size="lg"
                        >
                          {signature ? (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              {isDownloading ? "Procesando..." : "Enviar documento firmado"}
                            </>
                          ) : (
                            <>
                              <PenLine className="w-4 h-4 mr-2" />
                              Agregar firma
                            </>
                          )}
                        </Button>

                        <p className="text-[11px] text-muted-foreground/60 text-center">
                          {!signature ? stepLabels[1] : stepLabels[2]}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar envío
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              <p>
                Al enviar confirmas que la información es correcta y aceptas los términos del documento.
              </p>
              <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>Documento firmado digitalmente</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                La firma quedará integrada al documento. Podrás descargar una copia.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Confirmar y enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
