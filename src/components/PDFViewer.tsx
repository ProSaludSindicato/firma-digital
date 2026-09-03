import { useEffect, useState, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, PenLine, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFThumbnails } from "./PDFThumbnails";
import { PDFPageView } from "./PDFPageView";
import { SignatureModal } from "./SignatureModal";
import { useIsMobile, useIsLandscapeMobile } from "@/hooks/use-mobile";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditEventType } from "@/hooks/useAuditTrail";
import {
  getResponsiveViewerZoom,
  stepViewerZoom,
  type SignaturePageScrollBlock,
} from "@/lib/pdfViewerConfig";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

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
  onTrackEvent?: (type: AuditEventType, metadata?: Record<string, unknown>) => void;
  /** Called when the user opens the signature modal from within the viewer (not programmatically). */
  onSignatureModalOpen?: () => void;
  /** Si es true, tras `signaturePageScrollDelayMs` salta a la página de firma al abrir el PDF. Por defecto false (permanece en página 1). */
  scrollToSignaturePageOnLoad?: boolean;
  /** Milisegundos antes del salto automático a la página de firma (solo si `scrollToSignaturePageOnLoad`). */
  signaturePageScrollDelayMs?: number;
  /** Muestra todas las páginas en una columna con scroll; la firma sigue ligada al número de página. */
  continuousScroll?: boolean;
  /**
   * Alineación vertical al hacer scroll a la página de firma (solo scroll continuo).
   * El resto de saltos de página usan el inicio de la página.
   */
  signaturePageScrollBlock?: SignaturePageScrollBlock;
}

export interface PDFViewerRef {
  activatePlacementMode: () => void;
  openSignatureModal: () => void;
  closeSignatureModal: () => void;
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
  onTrackEvent,
  onSignatureModalOpen,
  scrollToSignaturePageOnLoad = false,
  signaturePageScrollDelayMs = 600,
  continuousScroll = false,
  signaturePageScrollBlock = "end",
}, ref) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const pageAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [placeholderPosition, setPlaceholderPosition] = useState<{ x: number; y: number; page: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const isMobile = useIsMobile();
  const isLandscapeMobile = useIsLandscapeMobile();

  const [scale, setScale] = useState(getResponsiveViewerZoom);

  // Recalculate zoom when orientation changes (e.g. portrait ↔ landscape on mobile)
  useEffect(() => {
    const handleOrientationChange = () => {
      // Brief delay to let the browser finalise the new viewport dimensions
      const t = window.setTimeout(() => setScale(getResponsiveViewerZoom()), 120);
      return t;
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    return () => window.removeEventListener("orientationchange", handleOrientationChange);
  }, []);

  const scrollPageIntoView = useCallback(
    (
      page: number,
      options?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition },
    ) => {
      const el = pageAnchorRefs.current[page - 1];
      if (!el) return;
      const behavior = options?.behavior ?? "smooth";
      const block =
        options?.block ?? (page === SIGNATURE_PAGE ? signaturePageScrollBlock : "start");
      el.scrollIntoView({ behavior, block });
    },
    [signaturePageScrollBlock],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [file]);

  useEffect(() => {
    if (!continuousScroll || isLoading || !pdfDoc) return;
    const id = requestAnimationFrame(() => {
      const el = mainScrollRef.current;
      if (el) el.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [file, continuousScroll, isLoading, pdfDoc]);

  // Scroll-based page detection (more reliable than IntersectionObserver on iOS / mobile WebKit).
  useEffect(() => {
    if (!continuousScroll || !pdfDoc || isLoading || totalPages === 0) return;
    const root = mainScrollRef.current;
    if (!root) return;

    let raf = 0;
    const computeVisiblePage = () => {
      raf = 0;
      const rootRect = root.getBoundingClientRect();
      if (rootRect.height < 8) return;

      let bestPage = 1;
      let bestVisible = -1;

      for (let i = 0; i < totalPages; i++) {
        const el = pageAnchorRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const overlapTop = Math.max(r.top, rootRect.top);
        const overlapBottom = Math.min(r.bottom, rootRect.bottom);
        const visible = Math.max(0, overlapBottom - overlapTop);
        if (visible > bestVisible) {
          bestVisible = visible;
          bestPage = i + 1;
        }
      }

      if (bestVisible > 0) {
        setCurrentPage((prev) => (prev !== bestPage ? bestPage : prev));
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(computeVisiblePage);
    };

    root.addEventListener("scroll", schedule, { passive: true });
    root.addEventListener("touchmove", schedule, { passive: true });
    root.addEventListener("scrollend", schedule);
    window.addEventListener("resize", schedule);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(root);

    schedule();
    const t = window.setTimeout(schedule, 150);

    return () => {
      root.removeEventListener("scroll", schedule);
      root.removeEventListener("touchmove", schedule);
      root.removeEventListener("scrollend", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
      window.clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [continuousScroll, pdfDoc, isLoading, totalPages, scale]);

  useEffect(() => {
    let isCancelled = false;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    setIsLoading(true);

    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (isCancelled) return;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        onTotalPagesChange(pdf.numPages);
        setPlaceholderPosition(null);

        onTrackEvent?.("document_opened", {
          fileName: file.name,
          totalPages: pdf.numPages,
          fileSize: file.size,
        });

        setCurrentPage(1);

        if (isCancelled) return;

        if (
          scrollToSignaturePageOnLoad &&
          pdf.numPages >= SIGNATURE_PAGE &&
          signaturePageScrollDelayMs >= 0
        ) {
          scrollTimer = setTimeout(() => {
            if (!isCancelled) {
              setCurrentPage(SIGNATURE_PAGE);
              if (continuousScroll) {
                requestAnimationFrame(() => scrollPageIntoView(SIGNATURE_PAGE));
              }
              onTrackEvent?.("page_navigated", { page: SIGNATURE_PAGE, auto: true });
            }
          }, signaturePageScrollDelayMs);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    loadPdf();

    return () => {
      isCancelled = true;
      if (scrollTimer !== undefined) clearTimeout(scrollTimer);
    };
  }, [
    file,
    onTotalPagesChange,
    onTrackEvent,
    scrollToSignaturePageOnLoad,
    signaturePageScrollDelayMs,
    continuousScroll,
    scrollPageIntoView,
  ]);

  useEffect(() => {
    if (pdfDoc && !signature) {
      setIsPlacementMode(true);
      setShowGuide(true);
    }
  }, [pdfDoc, signature]);

  const handlePageSelect = useCallback(
    (page: number) => {
      if (continuousScroll) {
        scrollPageIntoView(page);
      }
      setCurrentPage(page);
      onTrackEvent?.("page_navigated", { page });
    },
    [continuousScroll, scrollPageIntoView, onTrackEvent],
  );

  const handlePrevPage = useCallback(() => {
    const next = Math.max(1, currentPage - 1);
    if (continuousScroll) {
      scrollPageIntoView(next);
    }
    setCurrentPage(next);
    onTrackEvent?.("page_navigated", { page: next });
  }, [currentPage, continuousScroll, scrollPageIntoView, onTrackEvent]);

  const handleNextPage = useCallback(() => {
    const next = Math.min(totalPages, currentPage + 1);
    if (continuousScroll) {
      scrollPageIntoView(next);
    }
    setCurrentPage(next);
    onTrackEvent?.("page_navigated", { page: next });
  }, [currentPage, totalPages, continuousScroll, scrollPageIntoView, onTrackEvent]);

  const handlePlaceholderClick = useCallback(() => {
    setIsModalOpen(true);
    setIsPlacementMode(false);
    setShowGuide(false);
    onTrackEvent?.("signature_area_clicked", { page: placeholderPosition?.page ?? currentPage });
    onSignatureModalOpen?.();
  }, [currentPage, placeholderPosition?.page, onTrackEvent, onSignatureModalOpen]);

  const handleActivatePlacementMode = useCallback(() => {
    if (!signature) {
      setIsPlacementMode(true);
      setShowGuide(true);
      if (currentPage !== SIGNATURE_PAGE && totalPages >= SIGNATURE_PAGE) {
        setCurrentPage(SIGNATURE_PAGE);
        if (continuousScroll) {
          requestAnimationFrame(() => scrollPageIntoView(SIGNATURE_PAGE));
        }
        toast({
          title: "Página de firma",
          description: `Navega a la página ${SIGNATURE_PAGE} para colocar tu firma.`,
          className: "bg-green-600 text-white border-green-700 [&_button]:text-white [&_button]:opacity-90 [&_button:hover]:opacity-100",
        });
      }
    }
  }, [signature, currentPage, totalPages, continuousScroll, scrollPageIntoView]);

  const handleWrongPageClick = useCallback(
    (_clickedPage: number, expectedPage: number) => {
      setCurrentPage(expectedPage);
      if (continuousScroll) {
        requestAnimationFrame(() => scrollPageIntoView(expectedPage));
      }
      toast({
        title: "Página de firma",
        description: `La firma se coloca en la página ${expectedPage}.`,
        className: "bg-green-600 text-white border-green-700 [&_button]:text-white [&_button]:opacity-90 [&_button:hover]:opacity-100",
      });
    },
    [continuousScroll, scrollPageIntoView],
  );

  useImperativeHandle(ref, () => ({
    activatePlacementMode: handleActivatePlacementMode,
    openSignatureModal: () => {
      setIsModalOpen(true);
      setIsPlacementMode(false);
    },
    closeSignatureModal: () => {
      setIsModalOpen(false);
    },
  }), [handleActivatePlacementMode]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => stepViewerZoom(s, 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => stepViewerZoom(s, -1));
  }, []);

  const handleFirstPage = useCallback(() => {
    if (continuousScroll) {
      scrollPageIntoView(1);
    }
    setCurrentPage(1);
  }, [continuousScroll, scrollPageIntoView]);

  const handleLastPage = useCallback(() => {
    if (continuousScroll && totalPages > 0) {
      scrollPageIntoView(totalPages);
    }
    setCurrentPage(totalPages);
  }, [totalPages, continuousScroll, scrollPageIntoView]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  useKeyboardShortcuts(
    [
      { key: 'ArrowLeft', handler: () => handlePrevPage(), description: 'Página anterior' },
      { key: 'ArrowRight', handler: () => handleNextPage(), description: 'Página siguiente' },
      { key: 'Home', handler: () => handleFirstPage(), description: 'Primera página' },
      { key: 'End', handler: () => handleLastPage(), description: 'Última página' },
      { key: '+', handler: () => handleZoomIn(), description: 'Acercar' },
      { key: '=', handler: () => handleZoomIn(), description: 'Acercar' },
      { key: '-', handler: () => handleZoomOut(), description: 'Alejar' },
      { key: '_', handler: () => handleZoomOut(), description: 'Alejar' },
      {
        key: 'Escape',
        handler: () => {
          if (isModalOpen) handleCloseModal();
          else if (isPlacementMode) setIsPlacementMode(false);
        },
        description: 'Cerrar modal o cancelar',
      },
    ],
    !isLoading && pdfDoc !== null && !isLocked
  );

  const handleSignatureCreate = useCallback(
    (sig: string) => {
      onSignatureCreate(sig);
      setShowGuide(false);

      if (placeholderPosition) {
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

        onTrackEvent?.("signature_positioned", {
          page: placeholderPosition.page,
          x: placeholderPosition.x,
          y: placeholderPosition.y,
        });

        setPlaceholderPosition(null);
        setIsPlacementMode(false);
      }
    },
    [placeholderPosition, onSignatureCreate, onSignaturePositionChange, scale, isMobile, onTrackEvent]
  );

  const handleClearSignatureFromModal = useCallback(() => {
    if (signaturePosition) {
      setPlaceholderPosition({
        x: signaturePosition.x,
        y: signaturePosition.y,
        page: signaturePosition.page,
      });
    }
    onClearSignature();
    onTrackEvent?.("signature_cleared");
  }, [signaturePosition, onClearSignature, onTrackEvent]);

  const isOnSignaturePage = currentPage === SIGNATURE_PAGE;

  const goToSignaturePage = useCallback(() => {
    setCurrentPage(SIGNATURE_PAGE);
    if (continuousScroll) {
      requestAnimationFrame(() => scrollPageIntoView(SIGNATURE_PAGE));
    }
    onTrackEvent?.("page_navigated", { page: SIGNATURE_PAGE, auto: false });
  }, [continuousScroll, scrollPageIntoView, onTrackEvent]);

  const guideMessage = (() => {
    if (isLocked || signature) return null;
    if (!isOnSignaturePage && totalPages >= SIGNATURE_PAGE) {
      return { text: `Ve a la página ${SIGNATURE_PAGE} para firmar`, action: "navigate" as const };
    }
    if (isOnSignaturePage && !placeholderPosition) {
      return { text: "Toca donde deseas colocar tu firma", action: "click" as const };
    }
    if (placeholderPosition) {
      return { text: "Toca el marcador para dibujar tu firma", action: "sign" as const };
    }
    return null;
  })();

  const guideBannerKey =
    guideMessage == null
      ? "none"
      : `${currentPage}-${guideMessage.action}-${guideMessage.text}`;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Slim toolbar */}
      <div className="flex items-center justify-between gap-2 bg-card/80 backdrop-blur-sm px-2 py-1.5 md:px-3 md:py-1.5 border-b border-border/50 flex-shrink-0">
        <div id="tour-pdf-toolbar-zoom" className="flex items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-7 w-7 text-foreground hover:bg-muted"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] font-semibold text-foreground min-w-[36px] text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-7 w-7 text-foreground hover:bg-muted"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div id="tour-pdf-toolbar-pages" className="flex items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="h-7 w-7 text-foreground hover:bg-muted disabled:opacity-30 transition-opacity duration-200 ease-out"
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
                  className={`min-w-[24px] h-6 px-1 rounded text-[11px] font-semibold transition-[background-color,color,box-shadow,transform] duration-300 ease-out motion-reduce:transition-none ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                      : page === SIGNATURE_PAGE
                      ? "text-primary bg-primary/15 hover:bg-primary/25"
                      : "text-foreground bg-transparent hover:bg-muted"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-foreground min-w-[48px] text-center tabular-nums px-1 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none">
              {currentPage} / {totalPages}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="h-7 w-7 text-foreground hover:bg-muted disabled:opacity-30 transition-opacity duration-200 ease-out"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <span className="text-[10px] text-muted-foreground hidden md:block truncate max-w-[180px] font-medium">
          {file.name}
        </span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <div id="tour-pdf-thumbnails" className={`hidden ${!isLandscapeMobile ? "md:block" : ""}`}>
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

        <div
          id="tour-pdf-area"
          ref={mainScrollRef}
          className="flex-1 overflow-auto flex flex-col items-stretch p-0 md:p-3 bg-muted/20 touch-pan-x touch-pan-y touch-pinch-zoom"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 animate-fade-in flex-1">
              <div className="relative">
                <Skeleton className="w-[300px] h-[400px] md:w-[400px] md:h-[520px] rounded-lg" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">Cargando documento...</span>
                </div>
              </div>
            </div>
          ) : continuousScroll && totalPages > 0 ? (
            <div className="flex flex-col items-center gap-4 md:gap-6 w-full min-h-0 py-2 pb-10">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <div
                  key={page}
                  ref={(el) => {
                    pageAnchorRefs.current[page - 1] = el;
                  }}
                  data-pdf-page={page}
                  className="flex justify-center w-full scroll-mt-2"
                >
                  <PDFPageView
                    pdfDoc={pdfDoc}
                    pageNumber={page}
                    scale={scale}
                    signature={signature}
                    signaturePosition={signaturePosition}
                    onSignaturePositionChange={onSignaturePositionChange}
                    placeholderPosition={placeholderPosition}
                    onPlaceholderPositionChange={(position) => {
                      setPlaceholderPosition(position);
                      if (position) {
                        setIsPlacementMode(false);
                        setShowGuide(true);
                      }
                    }}
                    onPlaceholderClick={handlePlaceholderClick}
                    signaturePageNumber={SIGNATURE_PAGE}
                    onWrongPageClick={handleWrongPageClick}
                    isPlacementMode={isPlacementMode}
                    onClearSignature={onClearSignature}
                    isLocked={isLocked}
                    placementHighlight={
                      isPlacementMode &&
                      !signature &&
                      !placeholderPosition &&
                      page === SIGNATURE_PAGE
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-start justify-center w-full min-h-0">
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
                  if (position) {
                    setIsPlacementMode(false);
                    setShowGuide(true);
                  }
                }}
                onPlaceholderClick={handlePlaceholderClick}
                signaturePageNumber={SIGNATURE_PAGE}
                onWrongPageClick={handleWrongPageClick}
                isPlacementMode={isPlacementMode}
                onClearSignature={onClearSignature}
                isLocked={isLocked}
                placementHighlight={isPlacementMode && !signature && !placeholderPosition}
              />
            </div>
          )}
        </div>

        {/* Inline guide banner */}
        {showGuide && guideMessage && !isLoading && (
          <div id="tour-guide-banner" className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-1.5rem)] pointer-events-none [&_button]:pointer-events-auto">
            <div
              key={guideBannerKey}
              className="animate-guide-banner-in motion-reduce:animate-none"
            >
              {guideMessage.action === "navigate" ? (
                <button
                  type="button"
                  onClick={goToSignaturePage}
                  className="flex items-center gap-2 bg-primary text-primary-foreground pl-4 pr-3 py-2 rounded-full shadow-lg text-sm font-medium hover:bg-primary/90 transition-[background-color,box-shadow,transform] duration-300 ease-out active:scale-[0.98]"
                >
                  <PenLine className="w-4 h-4 shrink-0" />
                  <span className="text-left">{guideMessage.text}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 animate-bounce motion-reduce:animate-none" />
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-foreground/85 text-background px-4 py-2 rounded-full shadow-lg text-sm font-medium backdrop-blur-sm transition-shadow duration-300 ease-out">
                  <PenLine className="w-4 h-4 shrink-0" />
                  <span>{guideMessage.text}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSignatureCreate={handleSignatureCreate}
        onClearSignature={handleClearSignatureFromModal}
        currentSignature={signature}
        onTrackEvent={onTrackEvent}
      />
    </div>
  );
});

PDFViewer.displayName = "PDFViewer";
