import { useEffect, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFThumbnails } from "./PDFThumbnails";
import { PDFPageView } from "./PDFPageView";
import { SignatureModal } from "./SignatureModal";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  signature: string | null;
  signaturePosition: { x: number; y: number; page: number; width: number; height: number } | null;
  onSignaturePositionChange: (position: { x: number; y: number; page: number; width: number; height: number } | null) => void;
  onSignatureCreate: (signature: string) => void;
  onClearSignature: () => void;
  totalPages: number;
  onTotalPagesChange: (total: number) => void;
}

export const PDFViewer = ({
  file,
  signature,
  signaturePosition,
  onSignaturePositionChange,
  onSignatureCreate,
  onClearSignature,
  onTotalPagesChange,
}: PDFViewerProps) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [placeholderPosition, setPlaceholderPosition] = useState<{ x: number; y: number; page: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Calculate responsive zoom based on screen width
  const getResponsiveZoom = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1920) return 1.6; // Very large screens: 160%
    if (width >= 1440) return 1.4; // Large screens: 140%
    if (width >= 768) return 1.0;  // Tablets: 100%
    return 0.8;                     // Mobile: 80%
  }, []);

  const [scale, setScale] = useState(getResponsiveZoom);

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      onTotalPagesChange(pdf.numPages);
      setCurrentPage(1);
      setPlaceholderPosition(null);
    };
    loadPdf();
  }, [file, onTotalPagesChange]);

  const handlePageSelect = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handlePlaceholderClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleSignatureCreate = useCallback(
    (sig: string) => {
      onSignatureCreate(sig);

      if (placeholderPosition) {
        const defaultWidth = 150;
        const defaultHeight = 60;

        onSignaturePositionChange({
          x: placeholderPosition.x,
          y: placeholderPosition.y,
          page: placeholderPosition.page,
          width: defaultWidth,
          height: defaultHeight,
        });

        setPlaceholderPosition(null);
      }
    },
    [placeholderPosition, onSignatureCreate, onSignaturePositionChange]
  );


  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 bg-card rounded-lg p-3 shadow-sm border border-border mb-4 flex-wrap">
        {/* Zoom controls - ghost style */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="h-8 w-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground min-w-[45px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.min(2, s + 0.2))}
            className="h-8 w-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Page navigation - outline style with background */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="h-9 px-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Anterior</span>
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[70px] text-center bg-muted px-2 py-1 rounded">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="h-9 px-3"
          >
            <span className="hidden sm:inline text-xs">Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Spacer for alignment */}
        <div className="w-[88px] hidden sm:block"></div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 border border-border rounded-lg overflow-hidden bg-muted/30 min-h-0">
        {/* Thumbnails sidebar */}
        <PDFThumbnails
          pdfDoc={pdfDoc}
          currentPage={currentPage}
          onPageSelect={handlePageSelect}
          signaturePage={signaturePosition?.page || null}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Page view */}
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
          <PDFPageView
            pdfDoc={pdfDoc}
            pageNumber={currentPage}
            scale={scale}
            signature={signature}
            signaturePosition={signaturePosition}
            onSignaturePositionChange={onSignaturePositionChange}
            placeholderPosition={placeholderPosition}
            onPlaceholderPositionChange={setPlaceholderPosition}
            onPlaceholderClick={handlePlaceholderClick}
            onClearSignature={onClearSignature}
          />
        </div>
      </div>

      {/* Page info footer */}
      <div className="flex justify-between items-center text-xs text-muted-foreground py-2 px-2">
        <span className="truncate max-w-[50%]">{file.name}</span>
        <span>Página {currentPage} de {totalPages}</span>
      </div>

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSignatureCreate={handleSignatureCreate}
      />
    </div>
  );
};
