import { useCallback, useRef, useState } from "react";
import { Maximize2, Move, Pencil, X } from "lucide-react";
import { getScaledFieldSizeLimits } from "@/lib/fieldDefaults";
import { isFieldVisuallyComplete } from "@/lib/fieldValidation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DocumentField } from "@/types/documentEditor";

interface FieldOverlayProps {
  field: DocumentField;
  viewerScale: number;
  canvasSize: { width: number; height: number };
  isSelected: boolean;
  isLocked: boolean;
  lockedPlacement?: boolean;
  allowFieldRemoval?: boolean;
  onSelect: () => void;
  onUpdate: (changes: Partial<DocumentField>) => void;
  onRemove: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onRequestEdit?: () => void;
  children: React.ReactNode;
}

const FILL_STATE_TYPES = new Set<DocumentField["type"]>([
  "text",
  "number",
  "date",
  "checkbox",
  "signature",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const DRAG_THRESHOLD_PX = 5;

function suppressNextClick() {
  const suppress = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    document.removeEventListener("click", suppress, true);
  };
  document.addEventListener("click", suppress, true);
  window.setTimeout(() => {
    document.removeEventListener("click", suppress, true);
  }, 50);
}

const CHROME_BUTTON =
  "absolute z-20 flex items-center justify-center rounded-full shadow-sm";

export function FieldOverlay({
  field,
  viewerScale,
  canvasSize,
  isSelected,
  isLocked,
  lockedPlacement = false,
  allowFieldRemoval = true,
  onSelect,
  onUpdate,
  onRemove,
  onDragStateChange,
  onRequestEdit,
  children,
}: FieldOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isMobile = useIsMobile();

  const scaleRatio = viewerScale / (field.scale || 1);
  const displayWidth = field.width * scaleRatio;
  const displayHeight = field.height * scaleRatio;
  const left = field.x * scaleRatio - displayWidth / 2;
  const top = field.y * scaleRatio - displayHeight / 2;

  const canMove = !isLocked && !lockedPlacement;
  const isCompact = Math.min(displayWidth, displayHeight) < 44;
  const useExternalChrome = field.type === "checkbox" || isCompact;
  const usesFillState = FILL_STATE_TYPES.has(field.type);
  const isFilled = usesFillState && isFieldVisuallyComplete(field);
  const hasSignatureImage =
    field.type === "signature" && field.value?.type === "signature";
  const showEditControl = Boolean(onRequestEdit) && !isLocked && isSelected && hasSignatureImage;
  const showRemoveControl = canMove && isSelected && allowFieldRemoval;
  const showResizeControl = canMove && isSelected;
  const showMoveHandle =
    canMove && isSelected && field.type === "signature";

  const startDrag = useCallback(
    (
      pointerId: number,
      startClientX: number,
      startClientY: number,
      currentClient?: { x: number; y: number },
    ) => {
      setIsDragging(true);
      onDragStateChange?.(true);

      const startX = field.x;
      const startY = field.y;
      const halfW = field.width / 2;
      const halfH = field.height / 2;
      const maxX = canvasSize.width / scaleRatio - halfW;
      const maxY = canvasSize.height / scaleRatio - halfH;

      const applyMove = (clientX: number, clientY: number) => {
        const deltaX = (clientX - startClientX) / scaleRatio;
        const deltaY = (clientY - startClientY) / scaleRatio;
        onUpdate({
          x: clamp(startX + deltaX, halfW, Math.max(halfW, maxX)),
          y: clamp(startY + deltaY, halfH, Math.max(halfH, maxY)),
        });
      };

      if (currentClient) {
        applyMove(currentClient.x, currentClient.y);
      }

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        applyMove(moveEvent.clientX, moveEvent.clientY);
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) {
          return;
        }
        setIsDragging(false);
        onDragStateChange?.(false);
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
        suppressNextClick();
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [
      canvasSize.height,
      canvasSize.width,
      field.height,
      field.width,
      field.x,
      field.y,
      onDragStateChange,
      onUpdate,
      scaleRatio,
    ],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canMove) {
        onSelect();
        return;
      }

      const target = event.target as HTMLElement;
      const isNoDragTarget = Boolean(target.closest("[data-no-drag]"));

      if (!isNoDragTarget) {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        startDrag(event.pointerId, event.clientX, event.clientY);
        return;
      }

      onSelect();

      const pointerId = event.pointerId;
      const startClientX = event.clientX;
      const startClientY = event.clientY;

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        const distance = Math.hypot(
          moveEvent.clientX - startClientX,
          moveEvent.clientY - startClientY,
        );
        if (distance < DRAG_THRESHOLD_PX) {
          return;
        }

        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUpBeforeDrag);

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        startDrag(pointerId, startClientX, startClientY, {
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        });
      };

      const handleUpBeforeDrag = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) {
          return;
        }
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUpBeforeDrag);
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUpBeforeDrag);
    },
    [canMove, onSelect, startDrag],
  );

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canMove) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);
      onDragStateChange?.(true);

      const pointerId = event.pointerId;
      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const startWidth = field.width;
      const startHeight = field.height;
      const aspectRatio = startWidth / startHeight;
      const limits = getScaledFieldSizeLimits(
        field.type,
        field.scale || 1,
        isMobile,
      );

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        const deltaX = (moveEvent.clientX - startClientX) / scaleRatio;
        const deltaY = (moveEvent.clientY - startClientY) / scaleRatio;

        let nextWidth: number;
        let nextHeight: number;

        if (limits.lockAspectRatio) {
          const delta =
            Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;
          nextWidth = clamp(
            startWidth + delta,
            limits.minWidth,
            limits.maxWidth,
          );
          nextHeight = nextWidth / aspectRatio;
          nextHeight = clamp(nextHeight, limits.minHeight, limits.maxHeight);
          nextWidth = nextHeight * aspectRatio;
        } else {
          nextWidth = clamp(
            startWidth + deltaX,
            limits.minWidth,
            limits.maxWidth,
          );
          nextHeight = clamp(
            startHeight + deltaY,
            limits.minHeight,
            limits.maxHeight,
          );
        }

        onUpdate({ width: nextWidth, height: nextHeight });
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) {
          return;
        }
        setIsResizing(false);
        onDragStateChange?.(false);
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [canMove, field.height, field.scale, field.type, field.width, isMobile, onDragStateChange, onUpdate, scaleRatio],
  );

  return (
    <div
      ref={overlayRef}
      role="group"
      aria-label={
        canMove && field.type === "signature"
          ? `${field.label}. Arrastra para mover`
          : field.label
      }
      title={canMove && field.type === "signature" ? "Arrastra para mover" : undefined}
      className={cn(
        "absolute z-10 select-none overflow-visible rounded-md touch-none",
        usesFillState
          ? cn(
              "border transition-[color,background-color,border-color] duration-150",
              isFilled
                ? "is-filled border-solid border-[#0F6B5C] bg-[#E3EFEA]"
                : "border-dashed border-[#B8791A] bg-[#FBEEDD]",
              isSelected && isFilled && "ring-2 ring-[#0F6B5C]/40 ring-offset-1",
              canMove && (isDragging ? "cursor-grabbing" : "cursor-grab"),
              !canMove && "cursor-default",
            )
          : cn(
              "transition-colors duration-150",
              field.type === "checkbox"
                ? "ring-2 ring-inset"
                : "ring-2 ring-inset ring-offset-0",
              isLocked
                ? "cursor-default ring-muted-foreground/30 bg-muted/10"
                : isSelected
                  ? "cursor-grab bg-primary/5 ring-primary"
                  : "cursor-grab bg-white/50 ring-primary/40 ring-dashed hover:ring-primary/70 dark:bg-white/5",
              (isDragging || isResizing) && "ring-primary",
              isDragging && "cursor-grabbing",
            ),
      )}
      style={{
        left,
        top,
        width: displayWidth,
        height: displayHeight,
      }}
      onPointerDown={handlePointerDown}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[3px] [container-type:size]">
        {children}
      </div>

      {showEditControl ? (
        <button
          type="button"
          data-no-drag
          aria-label={`Editar ${field.label}`}
          title="Editar firma"
          className={cn(
            CHROME_BUTTON,
            "h-5 w-5 border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground md:h-6 md:w-6",
            useExternalChrome
              ? "right-full top-1/2 mr-1.5 -translate-y-1/2"
              : "-top-2.5 -left-2.5",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onRequestEdit?.();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Pencil className="h-2.5 w-2.5 md:h-3 md:w-3" />
        </button>
      ) : null}

      {showRemoveControl ? (
        <button
          type="button"
          data-no-drag
          aria-label={`Eliminar ${field.label}`}
          className={cn(
            CHROME_BUTTON,
            "h-5 w-5 border border-red-500/70 bg-red-50 text-red-600 hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
            useExternalChrome
              ? "left-1/2 top-0 -translate-x-1/2 -translate-y-[calc(100%+6px)]"
              : "-top-2.5 -right-2.5",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}

      {showResizeControl ? (
        <div
          data-no-drag
          aria-label={`Redimensionar ${field.label}`}
          className={cn(
            CHROME_BUTTON,
            "cursor-se-resize bg-primary/80 text-primary-foreground hover:bg-primary",
            useExternalChrome
              ? "left-full top-1/2 ml-1.5 h-6 w-6 -translate-y-1/2"
              : "-bottom-1.5 -right-1.5 h-5 w-5 md:h-6 md:w-6",
          )}
          onPointerDown={handleResizePointerDown}
        >
          <Maximize2 className="h-2.5 w-2.5 rotate-90 md:h-3 md:w-3" />
        </div>
      ) : null}

      {showMoveHandle ? (
        <div
          aria-label={`Mover ${field.label}`}
          className={cn(
            CHROME_BUTTON,
            "cursor-grab border border-[#0F6B5C]/40 bg-white text-[#0F6B5C]",
            isDragging && "cursor-grabbing",
            useExternalChrome
              ? "left-1/2 top-full mt-1.5 h-6 w-6 -translate-x-1/2"
              : "-bottom-1.5 -left-1.5 h-5 w-5 md:h-6 md:w-6",
          )}
        >
          <Move className="h-2.5 w-2.5 md:h-3 md:w-3" />
        </div>
      ) : null}
    </div>
  );
}
