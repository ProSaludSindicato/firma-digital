import { useState } from "react";
import { Download, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { usePDFSigner } from "@/hooks/usePDFSigner";
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
    setShowConfirmDialog(true);
  };

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
        await downloadSignedPDF();
      }, 500);
      
    } catch (error) {
      console.error("Error al enviar el convenio:", error);
      toast({
        title: "Error al enviar el convenio",
        description: "Hubo un problema al enviar su convenio. Por favor, intente nuevamente.",
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
            <div className="text-center max-w-xl">
              <h2 className="text-3xl font-bold text-foreground mb-4">Firma tus documentos PDF</h2>
              <p className="text-muted-foreground">
                Sube tu documento, haz clic donde deseas firmar, y descarga el PDF firmado listo para enviar.
              </p>
            </div>
            <PDFUploader onFileSelect={handleFileSelect} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* PDF Viewer - full width on mobile */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <PDFViewer
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
            <div className="flex-shrink-0 h-24 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
            
            {/* Bottom action bar - fixed on mobile, static on desktop */}
            <div 
              className="fixed bottom-0 left-0 right-0 md:relative p-3 md:p-4 bg-background border-t border-border z-50"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
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
                  {!canDownload && pdfFile && (
                    <p className="text-xs text-muted-foreground text-center">
                      {!signature ? "Toque donde desea firmar" : "Ajuste la posición si es necesario"}
                    </p>
                  )}
                  <Button
                    onClick={handleFinishAndSend}
                    disabled={!canDownload || isDownloading}
                    className="w-full max-w-md"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isDownloading ? "Procesando..." : "Finalizar y Enviar Convenio"}
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
