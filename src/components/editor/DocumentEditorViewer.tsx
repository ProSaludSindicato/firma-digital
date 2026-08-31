import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Loader2,
} from "lucide-react";
import { DocumentEditorPageView } from "@/components/editor/DocumentEditorPageView";
import { FieldPropertiesPanel } from "@/components/editor/FieldPropertiesPanel";
import { FieldToolbar } from "@/components/editor/FieldToolbar";
import { PlacementCursorIndicator } from "@/components/editor/PlacementCursorIndicator";
import { ViewerZoomControl } from "@/components/editor/ViewerZoomControl";
import { PDFThumbnails } from "@/components/PDFThumbnails";
import { SignatureModal } from "@/components/SignatureModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsLandscapeMobile, useIsMobile } from "@/hooks/use-mobile";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePdfjsDocument } from "@/hooks/usePdfjsDocument";
import { toast } from "@/hooks/use-toast";
import type { SignaturePageScrollBlock } from "@/lib/pdfViewerConfig";
import type {
  DocumentField,
  EditorConstraints,
  FieldType,
  FieldValue,
} from "@/types/documentEditor";

export interface DocumentEditorViewerRef {
  activatePlacementMode: (type?: FieldType) => void;
  openSignatureModal: (fieldId?: string) => void;
  closeSignatureModal: () => void;
  goToConstrainedPage: () => void;
}

interface DocumentEditorViewerProps {
  file: File;
  fields: DocumentField[];
  activeFieldId: string | null;
  placingType: FieldType | null;
  constraints?: EditorConstraints;
  isLocked?: boolean;
  continuousScroll?: boolean;
  signaturePageScrollBlock?: SignaturePageScrollBlock;
  scrollToSignaturePageOnLoad?: boolean;
  signaturePageScrollDelayMs?: number;
  onTotalPagesChange?: (total: number) => void;
  onSelectField: (id: string | null) => void;
  onUpdateField: (id: string, changes: Partial<DocumentField>) => void;
  onRemoveField: (id: string) => void;
  onChangeValue: (id: string, value: FieldValue | null) => void;
  onPlaceField: (params: {
    type: FieldType;
    page: number;
    x: number;
    y: number;
    scale: number;
  }) => DocumentField;
  onSetPlacingType: (type: FieldType | null) => void;
  onUndoLastField?: () => void;
  onSignatureModalOpen?: () => void;
  onCurrentPageChange?: (page: number) => void;
}

export const DocumentEditorViewer = forwardRef<
  DocumentEditorViewerRef,
  DocumentEditorViewerProps
>(function DocumentEditorViewer(
  {
    file,
    fields,
    activeFieldId,
    placingType,
    constraints,
    isLocked = false,
    continuousScroll = true,
    signaturePageScrollBlock = "start",
    scrollToSignaturePageOnLoad = false,
    signaturePageScrollDelayMs = 600,
    onTotalPagesChange,
    onSelectField,
    onUpdateField,
    onRemoveField,
    onChangeValue,
    onPlaceField,
    onSetPlacingType,
    onUndoLastField,
    onSignatureModalOpen,
    onCurrentPageChange,
  },
  ref,
) {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const pageAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const suppressPlacementClickRef = useRef(false);
  const { pdfDoc, isLoading, totalPages } = usePdfjsDocument(file);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [signatureFieldId, setSignatureFieldId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const isMobile = useIsMobile();
  const isLandscapeMobile = useIsLandscapeMobile();

  const showToolbar = constraints?.showToolbar !== false;
  const showPropertiesPanel = constraints?.showPropertiesPanel === true;
  const allowedPages = constraints?.allowedPages;

  const getResponsiveZoom = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (height < 500 && width > height) {
      return Math.max(0.5, Math.min(1.4, (width - 24) / 612));
    }
    if (width >= 1440) return 1.8;
    if (width >= 1200) return 1.4;
    if (width >= 1024) return 1.4;
    if (width >= 768) return 1.2;
    const mobileZoom = (width - 8) / 612;
    return Math.max(0.5, Math.min(1.0, mobileZoom));
  }, []);

  const [scale, setScale] = useState(getResponsiveZoom);

  useEffect(() => {
    const handleOrientationChange = () => {
      const t = window.setTimeout(() => setScale(getResponsiveZoom()), 120);
      return t;
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    return () =>
      window.removeEventListener("orientationchange", handleOrientationChange);
  }, [getResponsiveZoom]);

  useEffect(() => {
    if (onTotalPagesChange && totalPages > 0) {
      onTotalPagesChange(totalPages);
    }
  }, [onTotalPagesChange, totalPages]);

  useEffect(() => {
    onCurrentPageChange?.(currentPage);
  }, [currentPage, onCurrentPageChange]);

  const scrollPageIntoView = useCallback(
    (
      page: number,
      options?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition },
    ) => {
      const el = pageAnchorRefs.current[page - 1];
      if (!el) return;
      const behavior = options?.behavior ?? "smooth";
      const isConstrainedPage = allowedPages?.includes(page);
      const block =
        options?.block ??
        (isConstrainedPage ? signaturePageScrollBlock : "start");
      el.scrollIntoView({ behavior, block });
    },
    [allowedPages, signaturePageScrollBlock],
  );

  useEffect(() => {
    if (
      !scrollToSignaturePageOnLoad ||
      isLoading ||
      !pdfDoc ||
      signaturePageScrollDelayMs < 0
    ) {
      return;
    }
    const target = allowedPages?.[0];
    if (!target || pdfDoc.numPages < target) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentPage(target);
      if (continuousScroll) {
        requestAnimationFrame(() => scrollPageIntoView(target));
      }
    }, signaturePageScrollDelayMs);

    return () => window.clearTimeout(timer);
  }, [
    allowedPages,
    continuousScroll,
    isLoading,
    pdfDoc,
    scrollPageIntoView,
    scrollToSignaturePageOnLoad,
    signaturePageScrollDelayMs,
  ]);

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

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
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

  const handlePageSelect = useCallback(
    (page: number) => {
      if (continuousScroll) {
        scrollPageIntoView(page);
      }
      setCurrentPage(page);
    },
    [continuousScroll, scrollPageIntoView],
  );

  const handlePrevPage = useCallback(() => {
    const next = Math.max(1, currentPage - 1);
    handlePageSelect(next);
  }, [currentPage, handlePageSelect]);

  const handleNextPage = useCallback(() => {
    const next = Math.min(totalPages, currentPage + 1);
    handlePageSelect(next);
  }, [currentPage, handlePageSelect, totalPages]);

  const goToConstrainedPage = useCallback(() => {
    const target = allowedPages?.[0];
    if (!target) return;
    handlePageSelect(target);
  }, [allowedPages, handlePageSelect]);

  const handleActivatePlacementMode = useCallback(
    (type?: FieldType) => {
      const nextType =
        type ?? constraints?.allowedTypes?.[0] ?? placingType ?? "signature";
      onSetPlacingType(nextType);
      const targetPage = allowedPages?.[0];
      if (targetPage && currentPage !== targetPage && totalPages >= targetPage) {
        handlePageSelect(targetPage);
        toast({
          title: "Colocar campo",
          description: `Navega a la página ${targetPage} para colocar el campo.`,
        });
      }
    },
    [
      allowedPages,
      constraints?.allowedTypes,
      currentPage,
      handlePageSelect,
      onSetPlacingType,
      placingType,
      totalPages,
    ],
  );

  const handleRequestSignatureEdit = useCallback(
    (fieldId: string) => {
      setSignatureFieldId(fieldId);
      setIsModalOpen(true);
      onSignatureModalOpen?.();
    },
    [onSignatureModalOpen],
  );

  useImperativeHandle(
    ref,
    () => ({
      activatePlacementMode: handleActivatePlacementMode,
      goToConstrainedPage,
      openSignatureModal: (fieldId?: string) => {
        const target =
          fieldId ??
          fields.find((field) => field.type === "signature")?.id ??
          null;
        if (!target) return;
        setSignatureFieldId(target);
        setIsModalOpen(true);
      },
      closeSignatureModal: () => setIsModalOpen(false),
    }),
    [fields, goToConstrainedPage, handleActivatePlacementMode],
  );

  const handlePlaceOnPage = useCallback(
    (pageNumber: number, x: number, y: number) => {
      if (!placingType) return;
      const created = onPlaceField({
        type: placingType,
        page: pageNumber,
        x,
        y,
        scale,
      });
      if (created.type === "signature") {
        handleRequestSignatureEdit(created.id);
      }
    },
    [handleRequestSignatureEdit, onPlaceField, placingType, scale],
  );

  const handleDisallowedPageClick = useCallback(
    (_pageNumber: number) => {
      const expected = allowedPages?.[0];
      if (!expected) return;
      handlePageSelect(expected);
      toast({
        title: "Página de firma",
        description: `La firma se coloca en la página ${expected}.`,
        className:
          "bg-green-600 text-white border-green-700 [&_button]:text-white [&_button]:opacity-90 [&_button:hover]:opacity-100",
      });
    },
    [allowedPages, handlePageSelect],
  );

  const handleSignatureCreate = useCallback(
    (dataUrl: string) => {
      if (!signatureFieldId) return;
      onChangeValue(signatureFieldId, { type: "signature", dataUrl });
      setIsModalOpen(false);
    },
    [onChangeValue, signatureFieldId],
  );

  const handleClearSignature = useCallback(() => {
    if (!signatureFieldId) return;
    onChangeValue(signatureFieldId, null);
  }, [onChangeValue, signatureFieldId]);

  const signatureField = fields.find((field) => field.id === signatureFieldId);
  const currentSignature =
    signatureField?.value?.type === "signature"
      ? signatureField.value.dataUrl
      : null;

  const handleDeleteSelected = useCallback(() => {
    if (!activeFieldId || isLocked || constraints?.lockedPlacement) return;
    onRemoveField(activeFieldId);
  }, [
    activeFieldId,
    constraints?.lockedPlacement,
    isLocked,
    onRemoveField,
  ]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(2, s + 0.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, s - 0.2));
  }, []);

  useKeyboardShortcuts(
    [
      { key: "ArrowLeft", handler: () => handlePrevPage(), description: "Página anterior" },
      { key: "ArrowRight", handler: () => handleNextPage(), description: "Página siguiente" },
      {
        key: "+",
        handler: handleZoomIn,
        description: "Acercar",
      },
      {
        key: "=",
        handler: handleZoomIn,
        description: "Acercar",
      },
      {
        key: "-",
        handler: handleZoomOut,
        description: "Alejar",
      },
      {
        key: "Delete",
        handler: handleDeleteSelected,
        description: "Eliminar campo",
      },
      {
        key: "Backspace",
        handler: handleDeleteSelected,
        description: "Eliminar campo",
      },
      {
        key: "Escape",
        handler: () => {
          if (isModalOpen) setIsModalOpen(false);
          else if (placingType) onSetPlacingType(null);
          else onSelectField(null);
        },
        description: "Cerrar o cancelar",
      },
    ],
    !isLoading && pdfDoc !== null && !isLocked,
  );

  const constrainedPage = allowedPages?.[0];
  const hasSignatureValue = fields.some(
    (field) => field.type === "signature" && field.value?.type === "signature",
  );

  const markedPage =
    fields[0]?.page ?? constrainedPage ?? null;

  const showPlacementCursor =
    Boolean(placingType) &&
    showToolbar &&
    !isLocked &&
    !constraints?.lockedPlacement &&
    cursorPosition !== null;

  const handleDocumentAreaMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        !placingType ||
        !showToolbar ||
        isLocked ||
        constraints?.lockedPlacement
      ) {
        setCursorPosition(null);
        return;
      }
      setCursorPosition({ x: event.clientX, y: event.clientY });
    },
    [constraints?.lockedPlacement, isLocked, placingType, showToolbar],
  );

  const handleDocumentAreaMouseLeave = useCallback(() => {
    setCursorPosition(null);
  }, []);

  const renderPage = (page: number) => (
    <DocumentEditorPageView
      pdfDoc={pdfDoc}
      pageNumber={page}
      scale={scale}
      fields={fields}
      activeFieldId={activeFieldId}
      placingType={
        !showToolbar && !placingType && !hasSignatureValue && !constraints?.lockedPlacement
          ? "signature"
          : placingType
      }
      isLocked={isLocked}
      constraints={constraints}
      placementHighlight={
        Boolean(placingType || (!showToolbar && !hasSignatureValue)) &&
        !isLocked &&
        (constrainedPage ? page === constrainedPage : true)
      }
      suppressPlacementClickRef={suppressPlacementClickRef}
      onSelectField={onSelectField}
      onUpdateField={onUpdateField}
      onRemoveField={onRemoveField}
      onChangeValue={onChangeValue}
      onPlaceField={(x, y) => {
        if (
          !placingType &&
          !showToolbar &&
          !hasSignatureValue &&
          !constraints?.lockedPlacement
        ) {
          onSetPlacingType("signature");
          const created = onPlaceField({
            type: "signature",
            page,
            x,
            y,
            scale,
          });
          handleRequestSignatureEdit(created.id);
          return;
        }
        handlePlaceOnPage(page, x, y);
      }}
      onRequestSignatureEdit={handleRequestSignatureEdit}
      onDisallowedPageClick={handleDisallowedPageClick}
    />
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          id="tour-pdf-thumbnails"
          className={`hidden ${!isLandscapeMobile ? "md:block" : ""}`}
        >
          <PDFThumbnails
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            onPageSelect={handlePageSelect}
            signaturePage={markedPage}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            documentScale={scale}
          />
        </div>

        <div
          id="tour-pdf-area"
          ref={mainScrollRef}
          className="flex min-h-0 flex-1 flex-col items-stretch overflow-auto bg-muted/20 p-0 touch-pan-x touch-pan-y touch-pinch-zoom md:p-3"
          onMouseMove={handleDocumentAreaMouseMove}
          onMouseLeave={handleDocumentAreaMouseLeave}
        >
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
              <div className="relative">
                <Skeleton className="h-[400px] w-[300px] rounded-lg md:h-[520px] md:w-[400px]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Cargando documento...
                  </span>
                </div>
              </div>
            </div>
          ) : continuousScroll && totalPages > 0 ? (
            <div className="flex w-full min-h-0 flex-col items-center gap-4 py-2 pb-[5.5rem] md:gap-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <div
                    key={page}
                    ref={(el) => {
                      pageAnchorRefs.current[page - 1] = el;
                    }}
                    data-pdf-page={page}
                    className="flex w-full scroll-mt-2 justify-center"
                  >
                    {renderPage(page)}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="flex min-h-0 w-full flex-1 items-start justify-center">
              {renderPage(currentPage)}
            </div>
          )}
        </div>

        {showPropertiesPanel && !isMobile ? (
          <FieldPropertiesPanel
            field={fields.find((field) => field.id === activeFieldId) ?? null}
            disabled={isLocked || constraints?.lockedPlacement}
            onUpdate={onUpdateField}
            onRemove={onRemoveField}
          />
        ) : null}
      </div>

      {showToolbar && !isLocked && !constraints?.lockedPlacement ? (
        <FieldToolbar
          placingType={placingType}
          allowedTypes={constraints?.allowedTypes}
          disabled={isLocked}
          canUndo={fields.length > 0}
          onSelectType={onSetPlacingType}
          onUndo={onUndoLastField}
        />
      ) : null}

      {showPlacementCursor && placingType ? (
        <PlacementCursorIndicator
          placingType={placingType}
          x={cursorPosition!.x}
          y={cursorPosition!.y}
        />
      ) : null}

      {!isLoading && pdfDoc ? (
        <ViewerZoomControl
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      ) : null}

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSignatureCreate={handleSignatureCreate}
        onClearSignature={handleClearSignature}
        currentSignature={currentSignature}
      />
    </div>
  );
});
