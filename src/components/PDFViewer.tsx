import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFThumbnails } from "./PDFThumbnails";
import { PDFPageView } from "./PDFPageView";
import { SignatureModal } from "./SignatureModal";
import { SignatureTutorial, useSignatureTutorial } from "./SignatureTutorial";
import { useIsMobile } from "@/hooks/use-mobile";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";

// Configure PDF.js worker using Vite's import.meta.url resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// ⚙️ CONFIGURABLE: Page number where the signature should be placed
const SIGNATURE_PAGE = 2;

interface PDFViewerProps {
  file: File;
  signature: string | null;
  signaturePosition: { x: number; y: number; page: number; width: number; height: number; scale: number } | null;
  onSignaturePositionChange: (position: { x: number; y: number; page: number; width: number; height: number; scale: number } | null) => void;
  onSignatureCreate: (signature: string) => void;
  onClearSignature: () => void;
  totalPages: number;
  onTotalPagesChange: (total: number) => void;
  isLocked?: boolean;
}

export interface PDFViewerRef {
  activatePlacementMode: () => void;
}

export const PDFViewer = forwardRef<PDFViewerRef, PDFViewerProps>(({
  file,
  signature,
  signaturePosition,
  onSignaturePositionChange,
  onSignatureCreate,
  onClearSignature,
  onTotalPagesChange,
  isLocked = false,
}, ref) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [placeholderPosition, setPlaceholderPosition] = useState<{ x: number; y: number; page: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const isMobile = useIsMobile();
  const { showTutorial, checkAndShowTutorial, closeTutorial } = useSignatureTutorial();

  // Calculate responsive zoom - fit to screen width on mobile
  const getResponsiveZoom = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1440) return 1.6; // Large screens: 160%
    if (width >= 1200) return 1.2; // Medium-large screens: 120%
    if (width >= 1024) return 1.2; // Desktop: 120%
    if (width >= 768) return 1.0;  // Tablets: 100%
    // Mobile: fit document to screen width, user can pinch-zoom to read
    const mobileZoom = (width - 8) / 612; // 612pt = letter size width
    return Math.max(0.5, Math.min(1.0, mobileZoom));
  }, []);

  const [scale, setScale] = useState(getResponsiveZoom);

  // Load PDF
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (isCancelled) return;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        onTotalPagesChange(pdf.numPages);
        setCurrentPage(1);
        setPlaceholderPosition(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    loadPdf();
    
    return () => {
      isCancelled = true;
    };
  }, [file, onTotalPagesChange]);

  // Show tutorial when PDF loads for the first time (separate effect to avoid re-renders)
  useEffect(() => {
    if (pdfDoc) {
      checkAndShowTutorial();
    }
  }, [pdfDoc, checkAndShowTutorial]);

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
    setIsPlacementMode(false); // Desactivar modo de colocación al abrir modal
  }, []);

  const handleActivatePlacementMode = useCallback(() => {
    if (!signature) {
      // Activar modo de colocación
      setIsPlacementMode(true);
      // Si no estamos en la página de firma, ir a ella
      if (currentPage !== SIGNATURE_PAGE && totalPages >= SIGNATURE_PAGE) {
        setCurrentPage(SIGNATURE_PAGE);
      }
    }
  }, [signature, currentPage, totalPages]);

  // Exponer función para activar modo de colocación desde el componente padre
  useImperativeHandle(ref, () => ({
    activatePlacementMode: handleActivatePlacementMode,
  }), [handleActivatePlacementMode]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(2, s + 0.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, s - 0.2));
  }, []);

  const handleFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: 'ArrowLeft',
        handler: () => handlePrevPage(),
        description: 'Página anterior',
      },
      {
        key: 'ArrowRight',
        handler: () => handleNextPage(),
        description: 'Página siguiente',
      },
      {
        key: 'Home',
        handler: () => handleFirstPage(),
        description: 'Primera página',
      },
      {
        key: 'End',
        handler: () => handleLastPage(),
        description: 'Última página',
      },
      {
        key: '+',
        handler: () => handleZoomIn(),
        description: 'Acercar',
      },
      {
        key: '=',
        handler: () => handleZoomIn(),
        description: 'Acercar',
      },
      {
        key: '-',
        handler: () => handleZoomOut(),
        description: 'Alejar',
      },
      {
        key: '_',
        handler: () => handleZoomOut(),
        description: 'Alejar',
      },
      {
        key: 'Escape',
        handler: () => {
          if (isModalOpen) {
            handleCloseModal();
          } else if (isPlacementMode) {
            setIsPlacementMode(false);
          }
        },
        description: 'Cerrar modal o cancelar modo de colocación',
      },
    ],
    !isLoading && pdfDoc !== null && !isLocked
  );

  const handleSignatureCreate = useCallback(
    (sig: string) => {
      onSignatureCreate(sig);

      if (placeholderPosition) {
        // Smaller default size on mobile to avoid needing to resize
        // Increased height on desktop for better visibility
        const defaultWidth = isMobile ? 100 : 150;
        const defaultHeight = isMobile ? 40 : 80;

        onSignaturePositionChange({
          x: placeholderPosition.x,
          y: placeholderPosition.y,
          page: placeholderPosition.page,
          width: defaultWidth,
          height: defaultHeight,
          scale: scale,
        });

        setPlaceholderPosition(null);
        setIsPlacementMode(false); // Desactivar modo de colocación después de crear firma
      }
    },
    [placeholderPosition, onSignatureCreate, onSignaturePositionChange, scale, isMobile]
  );

  // Handle clearing signature from modal - restore placeholder at the same position
  const handleClearSignatureFromModal = useCallback(() => {
    if (signaturePosition) {
      // Restore placeholder at the signature's current position
      setPlaceholderPosition({
        x: signaturePosition.x,
        y: signaturePosition.y,
        page: signaturePosition.page,
      });
    }
    onClearSignature();
  }, [signaturePosition, onClearSignature]);

  const isOnSignaturePage = currentPage === SIGNATURE_PAGE;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar - compact on mobile */}
      <div className="flex items-center justify-between gap-2 bg-card p-2 md:p-3 border-b border-border flex-shrink-0">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="h-7 w-7 md:h-8 md:w-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.min(2, s + 0.2))}
            className="h-7 w-7 md:h-8 md:w-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Page navigation - Enhanced for mobile */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 md:h-8 md:w-8"
          >
            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
          
          {/* Page number buttons for quick navigation */}
          {totalPages <= 5 ? (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageSelect(page)}
                  className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground"
                      : page === SIGNATURE_PAGE
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-foreground min-w-[50px] text-center">
              {currentPage} / {totalPages}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 md:h-8 md:w-8"
          >
            <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
        </div>

        {/* File name - hidden on mobile, full on desktop */}
        <span className="text-xs text-muted-foreground hidden md:block">
          {file.name}
        </span>
      </div>

      {/* Main content - full width on mobile */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Thumbnails sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <PDFThumbnails
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            onPageSelect={handlePageSelect}
            signaturePage={signaturePosition?.page || null}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            documentScale={scale}
          />
        </div>

        {/* Page view - full width, pinch-to-zoom enabled on mobile */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-0 md:p-4 bg-muted/30 touch-pan-x touch-pan-y touch-pinch-zoom">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 animate-fade-in">
              <div className="relative">
                <Skeleton className="w-[300px] h-[400px] md:w-[400px] md:h-[520px] rounded-lg" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">
                    Cargando documento...
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <PDFPageView
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              scale={scale}
              signature={signature}
              signaturePosition={signaturePosition}
              onSignaturePositionChange={onSignaturePositionChange}
              placeholderPosition={placeholderPosition}
              onPlaceholderPositionChange={(position) => {
                setPlaceholderPosition(position);
                // Desactivar modo de colocación cuando se coloca el placeholder
                if (position) {
                  setIsPlacementMode(false);
                }
              }}
              onPlaceholderClick={handlePlaceholderClick}
              isPlacementMode={isPlacementMode}
              onClearSignature={onClearSignature}
              isLocked={isLocked}
              fileName={file.name}
            />
          )}
        </div>
      </div>

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSignatureCreate={handleSignatureCreate}
        onClearSignature={handleClearSignatureFromModal}
        currentSignature={signature}
      />

      <SignatureTutorial isOpen={showTutorial} onClose={closeTutorial} />
    </div>
  );
});

PDFViewer.displayName = "PDFViewer";
