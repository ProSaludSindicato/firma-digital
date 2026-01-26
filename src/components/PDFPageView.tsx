import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Move, Maximize2, Trash2 } from "lucide-react";
import { SignaturePlaceholder } from "./SignaturePlaceholder";

interface PDFPageViewProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  signature: string | null;
  signaturePosition: { x: number; y: number; page: number; width: number; height: number; scale: number } | null;
  onSignaturePositionChange: (
    position: { x: number; y: number; page: number; width: number; height: number; scale: number } | null,
  ) => void;
  placeholderPosition: { x: number; y: number; page: number } | null;
  onPlaceholderPositionChange: (position: { x: number; y: number; page: number } | null) => void;
  onPlaceholderClick: () => void;
  onClearSignature: () => void;
  isLocked?: boolean;
}

export const PDFPageView = ({
  pdfDoc,
  pageNumber,
  scale,
  signature,
  signaturePosition,
  onSignaturePositionChange,
  placeholderPosition,
  onPlaceholderPositionChange,
  onPlaceholderClick,
  onClearSignature,
  isLocked = false,
}: PDFPageViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Render the current page with higher resolution for better quality
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      const page = await pdfDoc.getPage(pageNumber);

      // Use higher pixel ratio for sharper text rendering
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale });
      const scaledViewport = page.getViewport({ scale: scale * pixelRatio });

      const canvas = canvasRef.current;
      // Set canvas internal size to high-res
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      // Set display size to normal
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

    renderPage();
  }, [pdfDoc, pageNumber, scale]);

  // Handle click to place placeholder
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging || isResizing || signature) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Ensure click is within canvas bounds
      if (x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height) {
        onPlaceholderPositionChange({
          x,
          y,
          page: pageNumber,
        });
      }
    },
    [isDragging, isResizing, signature, canvasSize, pageNumber, onPlaceholderPositionChange],
  );

  // Handle placeholder drag (mouse)
  const handlePlaceholderDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      if (!placeholderPosition || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const x = moveEvent.clientX - containerRect.left;
        const y = moveEvent.clientY - containerRect.top;

        const clampedX = Math.max(75, Math.min(canvasSize.width - 75, x));
        const clampedY = Math.max(18, Math.min(canvasSize.height - 18, y));

        onPlaceholderPositionChange({
          x: clampedX,
          y: clampedY,
          page: pageNumber,
        });
      };

      const handleMouseUp = () => {
        setTimeout(() => setIsDragging(false), 50);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [placeholderPosition, canvasSize, pageNumber, onPlaceholderPositionChange],
  );

  // Handle placeholder drag (touch)
  const handlePlaceholderTouchDrag = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      if (!placeholderPosition || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const touch = moveEvent.touches[0];
        const x = touch.clientX - containerRect.left;
        const y = touch.clientY - containerRect.top;

        const clampedX = Math.max(75, Math.min(canvasSize.width - 75, x));
        const clampedY = Math.max(18, Math.min(canvasSize.height - 18, y));

        onPlaceholderPositionChange({
          x: clampedX,
          y: clampedY,
          page: pageNumber,
        });
      };

      const handleTouchEnd = () => {
        setTimeout(() => setIsDragging(false), 50);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    },
    [placeholderPosition, canvasSize, pageNumber, onPlaceholderPositionChange],
  );

  // Handle signature drag (mouse)
  const handleSignatureDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      if (!signaturePosition || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const x = moveEvent.clientX - containerRect.left;
        const y = moveEvent.clientY - containerRect.top;

        const halfWidth = signaturePosition.width / 2;
        const halfHeight = signaturePosition.height / 2;

        const newX = Math.max(halfWidth, Math.min(canvasSize.width - halfWidth, x));
        const newY = Math.max(halfHeight, Math.min(canvasSize.height - halfHeight, y));

        onSignaturePositionChange({
          x: newX,
          y: newY,
          page: pageNumber,
          width: signaturePosition.width,
          height: signaturePosition.height,
          scale: signaturePosition.scale,
        });
      };

      const handleMouseUp = () => {
        setTimeout(() => setIsDragging(false), 50);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [signaturePosition, canvasSize, pageNumber, onSignaturePositionChange],
  );

  // Handle signature drag (touch)
  const handleSignatureTouchDrag = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      if (!signaturePosition || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const touch = moveEvent.touches[0];
        const x = touch.clientX - containerRect.left;
        const y = touch.clientY - containerRect.top;

        const halfWidth = signaturePosition.width / 2;
        const halfHeight = signaturePosition.height / 2;

        const newX = Math.max(halfWidth, Math.min(canvasSize.width - halfWidth, x));
        const newY = Math.max(halfHeight, Math.min(canvasSize.height - halfHeight, y));

        onSignaturePositionChange({
          x: newX,
          y: newY,
          page: pageNumber,
          width: signaturePosition.width,
          height: signaturePosition.height,
          scale: signaturePosition.scale,
        });
      };

      const handleTouchEnd = () => {
        setTimeout(() => setIsDragging(false), 50);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    },
    [signaturePosition, canvasSize, pageNumber, onSignaturePositionChange],
  );

  // Handle signature resize (mouse)
  const handleSignatureResize = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      if (!signaturePosition) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = signaturePosition.width;
      const startHeight = signaturePosition.height;
      const aspectRatio = startWidth / startHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;

        const newWidth = Math.max(80, Math.min(400, startWidth + delta));
        const newHeight = newWidth / aspectRatio;

        onSignaturePositionChange({
          ...signaturePosition,
          width: newWidth,
          height: newHeight,
        });
      };

      const handleMouseUp = () => {
        setTimeout(() => setIsResizing(false), 50);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [signaturePosition, onSignaturePositionChange],
  );

  // Handle signature resize (touch)
  const handleSignatureTouchResize = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      if (!signaturePosition) return;

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const startWidth = signaturePosition.width;
      const startHeight = signaturePosition.height;
      const aspectRatio = startWidth / startHeight;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const currentTouch = moveEvent.touches[0];
        const deltaX = currentTouch.clientX - startX;
        const deltaY = currentTouch.clientY - startY;
        const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;

        const newWidth = Math.max(80, Math.min(400, startWidth + delta));
        const newHeight = newWidth / aspectRatio;

        onSignaturePositionChange({
          ...signaturePosition,
          width: newWidth,
          height: newHeight,
        });
      };

      const handleTouchEnd = () => {
        setTimeout(() => setIsResizing(false), 50);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    },
    [signaturePosition, onSignaturePositionChange],
  );

  const showPlaceholder = !signature && placeholderPosition && placeholderPosition.page === pageNumber;
  const showSignature = signature && signaturePosition && signaturePosition.page === pageNumber;

  return (
    <div ref={containerRef} className="relative inline-block cursor-crosshair" onClick={handleCanvasClick}>
      <canvas ref={canvasRef} className="block shadow-lg rounded" />

      {/* Placeholder button */}
      {showPlaceholder && (
        <SignaturePlaceholder
          onClick={onPlaceholderClick}
          onDragStart={handlePlaceholderDrag}
          onTouchDragStart={handlePlaceholderTouchDrag}
          style={{
            left: placeholderPosition.x - 75,
            top: placeholderPosition.y - 18,
          }}
        />
      )}

      {/* Actual signature */}
      {showSignature &&
        (() => {
          // Calculate scale ratio to adjust position when zoom changes
          const scaleRatio = scale / signaturePosition.scale;
          const adjustedX = signaturePosition.x * scaleRatio;
          const adjustedY = signaturePosition.y * scaleRatio;
          const adjustedWidth = signaturePosition.width * scaleRatio;
          const adjustedHeight = signaturePosition.height * scaleRatio;

          return (
            <div
              className={`absolute select-none z-10 border-2 rounded-md p-1 transition-colors touch-none ${
                isLocked
                  ? "border-muted-foreground/50 bg-muted/30 cursor-default"
                  : "border-primary border-dashed bg-primary/5 hover:bg-primary/10 cursor-move"
              }`}
              style={{
                left: adjustedX - adjustedWidth / 2,
                top: adjustedY - adjustedHeight / 2,
                width: adjustedWidth,
              }}
              onMouseDown={isLocked ? undefined : handleSignatureDrag}
              onTouchStart={isLocked ? undefined : handleSignatureTouchDrag}
            >
              <img
                src={signature}
                alt="Firma"
                className="w-full h-auto pointer-events-none"
                style={{ maxHeight: adjustedHeight - 8 }}
                draggable={false}
              />
              {!isLocked && (
                <>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] leading-tight px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                    <Move className="w-3 h-3" />
                    Arrastra para mover
                  </div>
                  {/* Delete signature button */}
                  <div
                    className="absolute -top-2 -left-2 w-6 h-6 bg-destructive rounded-full cursor-pointer flex items-center justify-center shadow-md hover:bg-destructive/80 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSignature();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-3 h-3 text-destructive-foreground" />
                  </div>
                  {/* Resize handle */}
                  <div
                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-full cursor-se-resize flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors touch-none"
                    onMouseDown={handleSignatureResize}
                    onTouchStart={handleSignatureTouchResize}
                  >
                    <Maximize2 className="w-3 h-3 text-primary-foreground rotate-90" />
                  </div>
                </>
              )}
              {isLocked && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[10px] leading-tight px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                  Documento enviado
                </div>
              )}
            </div>
          );
        })()}

      {/* Instruction overlay
      {!signature && !placeholderPosition && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded">
          <p className="bg-secondary text-secondary-foreground px-4 py-3 rounded-lg shadow-xl font-semibold text-sm md:text-base border border-border">
            Haz clic donde deseas agregar tu firma
          </p>
        </div>
      )}*/}
    </div>
  );
};
