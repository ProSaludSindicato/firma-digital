import { Download } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
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
            <div className="flex flex-col gap-4">
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
              
              <div className="flex justify-center">
                <Button
                  onClick={downloadSignedPDF}
                  disabled={!canDownload || isDownloading}
                  size="lg"
                  className="min-w-[250px]"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {isDownloading ? "Procesando..." : "Descargar PDF firmado"}
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
