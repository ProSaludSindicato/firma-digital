import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FieldOverlay } from "@/components/editor/FieldOverlay";
import { FieldRenderer } from "@/components/editor/FieldRenderer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type {
  DocumentField,
  EditorConstraints,
  FieldType,
  FieldValue,
} from "@/types/documentEditor";

interface DocumentEditorPageViewProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  fields: DocumentField[];
  activeFieldId: string | null;
  placingType: FieldType | null;
  isLocked?: boolean;
  constraints?: EditorConstraints;
  placementHighlight?: boolean;
  suppressPlacementClickRef?: React.MutableRefObject<boolean>;
  onSelectField: (id: string | null) => void;
  onUpdateField: (id: string, changes: Partial<DocumentField>) => void;
  onRemoveField: (id: string) => void;
  onChangeValue: (id: string, value: FieldValue | null) => void;
  onPlaceField: (x: number, y: number) => void;
  onRequestSignatureEdit: (fieldId: string) => void;
  onDisallowedPageClick?: (pageNumber: number) => void;
}

export function DocumentEditorPageView({
  pdfDoc,
  pageNumber,
  scale,
  fields,
  activeFieldId,
  placingType,
  isLocked = false,
  constraints,
  placementHighlight = false,
  suppressPlacementClickRef,
  onSelectField,
  onUpdateField,
  onRemoveField,
  onChangeValue,
  onPlaceField,
  onRequestSignatureEdit,
  onDisallowedPageClick,
}: DocumentEditorPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isMobile = useIsMobile();

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) {
        return;
      }

      const page = await pdfDoc.getPage(pageNumber);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale });
      const scaledViewport = page.getViewport({ scale: scale * pixelRatio });

      const canvas = canvasRef.current;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setCanvasSize({ width: viewport.width, height: viewport.height });

      const context = canvas.getContext("2d");
      if (context) {
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;
      }
    };

    void renderPage();
  }, [pdfDoc, pageNumber, scale]);

  const pageFields = fields.filter((field) => field.page === pageNumber);
  const canPlace =
    !isLocked &&
    !constraints?.lockedPlacement &&
    Boolean(placingType) &&
    (!constraints?.maxFields || fields.length < constraints.maxFields);

  const handleFieldDragStateChange = useCallback(
    (isDragging: boolean) => {
      if (isDragging && suppressPlacementClickRef) {
        suppressPlacementClickRef.current = true;
      }
    },
    [suppressPlacementClickRef],
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isLocked) {
        return;
      }

      if (suppressPlacementClickRef?.current) {
        suppressPlacementClickRef.current = false;
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest("[role='group']")) {
        return;
      }

      if (!canPlace) {
        onSelectField(null);
        return;
      }

      if (
        constraints?.allowedPages &&
        !constraints.allowedPages.includes(pageNumber)
      ) {
        onDisallowedPageClick?.(pageNumber);
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height) {
        onPlaceField(x, y);
      }
    },
    [
      canPlace,
      canvasSize.height,
      canvasSize.width,
      constraints?.allowedPages,
      isLocked,
      onDisallowedPageClick,
      onPlaceField,
      onSelectField,
      pageNumber,
      suppressPlacementClickRef,
    ],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-block",
        canPlace ? "cursor-crosshair" : "cursor-default",
      )}
      onClick={handleCanvasClick}
    >
      <canvas ref={canvasRef} className="block rounded shadow-lg" />

      {pageFields.map((field) => {
        const scaleRatio = scale / (field.scale || 1);

        return (
        <FieldOverlay
          key={field.id}
          field={field}
          viewerScale={scale}
          canvasSize={canvasSize}
          isSelected={activeFieldId === field.id}
          isLocked={isLocked}
          lockedPlacement={constraints?.lockedPlacement}
          onSelect={() => onSelectField(field.id)}
          onUpdate={(changes) => onUpdateField(field.id, changes)}
          onRemove={() => onRemoveField(field.id)}
          onDragStateChange={handleFieldDragStateChange}
          onRequestEdit={
            field.type === "signature"
              ? () => onRequestSignatureEdit(field.id)
              : undefined
          }
        >
          <FieldRenderer
            field={field}
            isSelected={activeFieldId === field.id}
            isLocked={isLocked}
            scaleRatio={scaleRatio}
            isMobile={isMobile}
            onChangeValue={(value) => onChangeValue(field.id, value)}
            onFieldUpdate={(changes) => onUpdateField(field.id, changes)}
            onRequestSignatureEdit={() => onRequestSignatureEdit(field.id)}
          />
        </FieldOverlay>
        );
      })}

      {placementHighlight ? (
        <div className="pointer-events-none absolute inset-0 rounded border-2 border-dashed border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]" />
      ) : null}
    </div>
  );
}
