import { useState } from "react";
import { Download, Send, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { usePDFSigner } from "@/hooks/usePDFSigner";
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

  const handleConfirmSend = () => {
    // TODO: Implementar lógica de envío real
    console.log("Convenio enviado");
    setIsSent(true);
    setShowConfirmDialog(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        showFinishButton={!!signature && !!signaturePosition} 
        onFinish={handleFinishAndSend}
        isProcessing={isDownloading}
      />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {!pdfFile ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <div className="text-center max-w-xl">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Firma tus documentos PDF
                </h2>
                <p className="text-muted-foreground">
                  Sube tu documento, haz clic donde deseas firmar, 
                  y descarga el PDF firmado listo para enviar.
                </p>
              </div>
              <PDFUploader onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-[calc(100vh-180px)]">
              <PDFViewer
                file={pdfFile}
                signature={signature}
                signaturePosition={signaturePosition}
                onSignaturePositionChange={setSignaturePosition}
                onSignatureCreate={handleSignatureCreate}
                onClearSignature={handleClearSignature}
                totalPages={totalPages}
                onTotalPagesChange={setTotalPages}
              />
              
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {!isSent ? (
                  <Button
                    onClick={handleFinishAndSend}
                    disabled={!canDownload || isDownloading}
                    size="lg"
                    className="min-w-[250px]"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {isDownloading ? "Procesando..." : "Finalizar y Enviar convenio"}
                  </Button>
                ) : (
                  <Button
                    onClick={downloadSignedPDF}
                    disabled={isDownloading}
                    size="lg"
                    className="min-w-[250px]"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {isDownloading ? "Procesando..." : "Descargar PDF firmado"}
                  </Button>
                )}
              </div>
              
              {!isSent && !canDownload && pdfFile && (
                <p className="text-sm text-muted-foreground text-center">
                  {!signature
                    ? "Haz clic en el documento y agrega tu firma para continuar"
                    : "Ajusta la posición de tu firma si es necesario"}
                </p>
              )}
              
              {isSent && (
                <p className="text-sm text-primary text-center font-medium">
                  ✓ Convenio enviado exitosamente. Ahora puede descargar su copia.
                </p>
              )}
            </div>
          )}
        </div>
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
                <strong>⚠️ Al confirmar, la firma quedará integrada al documento y no podrá modificarse.</strong>
              </p>
              <p className="text-muted-foreground">
                Asegúrese de que la firma esté correctamente ubicada antes de continuar. 
                Una vez enviado, podrá descargar una copia del documento firmado.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              Confirmar y Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
