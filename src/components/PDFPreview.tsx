import { useEffect, useState, useCallback, useRef } from "react";
import { installPdfjsMainThreadWorker, pdfjsLib } from "@/lib/pdfjsSetup";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PDFThumbnails } from "@/components/PDFThumbnails";
import { useIsMobile } from "@/hooks/use-mobile";
import { getResponsiveViewerZoom, stepViewerZoom } from "@/lib/pdfViewerConfig";

interface PDFPreviewProps {
  pdfUrl: string;
  onClose?: () => void;
}

export const PDFPreview = ({ pdfUrl, onClose }: PDFPreviewProps) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [thumbnailsCollapsed, setThumbnailsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let isCancelled = false;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        installPdfjsMainThreadWorker();
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          setScale(getResponsiveViewerZoom());
        }
      } catch (error) {
        console.error("Error al cargar el PDF:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handlePageSelect = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => stepViewerZoom(prev, 1));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => stepViewerZoom(prev, -1));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Combined header + toolbar */}
      <div className="flex items-center justify-between gap-2 bg-card/80 backdrop-blur-sm px-2 py-1.5 md:px-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs md:text-sm font-semibold truncate">Vista previa</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1 py-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={isLoading}
              className="h-7 w-7 text-foreground hover:bg-muted disabled:opacity-30"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-semibold text-foreground min-w-[36px] text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={isLoading}
              className="h-7 w-7 text-foreground hover:bg-muted disabled:opacity-30"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1 py-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1 || isLoading}
              className="h-7 w-7 text-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {totalPages <= 5 ? (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageSelect(page)}
                    disabled={isLoading}
                    className={`min-w-[24px] h-6 px-1 rounded text-[11px] font-semibold transition-all disabled:opacity-30 ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground bg-transparent hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-foreground min-w-[48px] text-center tabular-nums px-1">
                {currentPage} / {totalPages}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages || isLoading}
              className="h-7 w-7 text-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!isMobile && (
          <PDFThumbnails
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            onPageSelect={handlePageSelect}
            signaturePage={null}
            isCollapsed={thumbnailsCollapsed}
            onToggle={() => setThumbnailsCollapsed(!thumbnailsCollapsed)}
            documentScale={scale}
          />
        )}

        <div className="flex-1 overflow-auto flex items-start justify-center p-3 bg-muted/20 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="relative">
                <Skeleton className="w-[300px] h-[400px] md:w-[400px] md:h-[520px] rounded-lg" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">Cargando documento...</span>
                </div>
              </div>
            </div>
          ) : (
            pdfDoc && (
              <PDFPageCanvas
                pdfDoc={pdfDoc}
                pageNumber={currentPage}
                scale={scale}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

interface PDFPageCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

const PDFPageCanvas = ({ pdfDoc, pageNumber, scale }: PDFPageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      const page = await pdfDoc.getPage(pageNumber);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale });
      const scaledViewport = page.getViewport({ scale: scale * pixelRatio });

      const canvas = canvasRef.current;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const context = canvas.getContext("2d");
      if (context) {
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;
      }
    };

    renderPage();
  }, [pdfDoc, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="shadow-lg rounded-lg bg-white"
    />
  );
};
