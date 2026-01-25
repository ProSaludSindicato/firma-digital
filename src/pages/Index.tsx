import { Download, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { usePDFSigner } from "@/hooks/usePDFSigner";

const Index = () => {
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
    // TODO: Implementar lógica de envío
    console.log("Finalizar y enviar convenio");
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
                <Button
                  onClick={handleFinishAndSend}
                  disabled={!canDownload || isDownloading}
                  size="lg"
                  className="min-w-[250px]"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {isDownloading ? "Procesando..." : "Finalizar y Enviar convenio"}
                </Button>
                <Button
                  onClick={downloadSignedPDF}
                  disabled={!canDownload || isDownloading}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px]"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Descargar PDF
                </Button>
              </div>
              
              {!canDownload && pdfFile && (
                <p className="text-sm text-muted-foreground text-center">
                  {!signature
                    ? "Haz clic en el documento y agrega tu firma para continuar"
                    : "Ajusta la posición de tu firma si es necesario"}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
