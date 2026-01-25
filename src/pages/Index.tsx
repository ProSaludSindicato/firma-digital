import { Download } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer } from "@/components/PDFViewer";
import { SignaturePanel } from "@/components/SignaturePanel";
import { Button } from "@/components/ui/button";
import { usePDFSigner } from "@/hooks/usePDFSigner";

const Index = () => {
  const {
    pdfFile,
    signature,
    signaturePosition,
    currentPage,
    totalPages,
    isDownloading,
    canDownload,
    handleFileSelect,
    handleSignatureCreate,
    handleClearSignature,
    setSignaturePosition,
    setCurrentPage,
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
                  Sube tu documento, agrega tu firma dibujándola o subiendo una imagen, 
                  y descarga el PDF firmado listo para enviar.
                </p>
              </div>
              <PDFUploader onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-4 gap-6">
              <div className="xl:col-span-4 lg:col-span-3">
                <PDFViewer
                  file={pdfFile}
                  signature={signature}
                  signaturePosition={signaturePosition}
                  onSignaturePositionChange={setSignaturePosition}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  totalPages={totalPages}
                  onTotalPagesChange={setTotalPages}
                />
              </div>
              
              <div className="space-y-4">
                <PDFUploader
                  onFileSelect={handleFileSelect}
                  fileName={pdfFile.name}
                />
                
                <SignaturePanel
                  onSignatureCreate={handleSignatureCreate}
                  onClearSignature={handleClearSignature}
                  hasSignature={!!signature}
                />
                
                <Button
                  onClick={downloadSignedPDF}
                  disabled={!canDownload || isDownloading}
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {isDownloading ? "Procesando..." : "Descargar PDF firmado"}
                </Button>
                
                {!canDownload && pdfFile && (
                  <p className="text-sm text-muted-foreground text-center">
                    {!signature
                      ? "Agrega tu firma para continuar"
                      : "Coloca la firma en el documento"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
