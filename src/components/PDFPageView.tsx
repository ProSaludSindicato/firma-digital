import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Move, Maximize2, Trash2 } from "lucide-react";
import { SignaturePlaceholder } from "./SignaturePlaceholder";

interface PDFPageViewProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  signature: string | null;
  signaturePosition: { x: number; y: number; page: number; width: number; height: number } | null;
  onSignaturePositionChange: (position: { x: number; y: number; page: number; width: number; height: number } | null) => void;
  placeholderPosition: { x: number; y: number; page: number } | null;
  onPlaceholderPositionChange: (position: { x: number; y: number; page: number } | null) => void;
  onPlaceholderClick: () => void;
  onClearSignature: () => void;
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
}: PDFPageViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Render the current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      setCanvasSize({ width: viewport.width, height: viewport.height });

      const context = canvas.getContext("2d");
      if (context) {
        await page.render({
          canvasContext: context,
          viewport,
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
    [isDragging, isResizing, signature, canvasSize, pageNumber, onPlaceholderPositionChange]
  );

  // Handle placeholder drag
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
    [placeholderPosition, canvasSize, pageNumber, onPlaceholderPositionChange]
  );

  // Handle signature drag
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
    [signaturePosition, canvasSize, pageNumber, onSignaturePositionChange]
  );

  // Handle signature resize
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
    [signaturePosition, onSignaturePositionChange]
  );

  const showPlaceholder = !signature && placeholderPosition && placeholderPosition.page === pageNumber;
  const showSignature = signature && signaturePosition && signaturePosition.page === pageNumber;

  return (
    <div
      ref={containerRef}
      className="relative inline-block cursor-crosshair"
      onClick={handleCanvasClick}
    >
      <canvas ref={canvasRef} className="block shadow-lg rounded" />

      {/* Placeholder button */}
      {showPlaceholder && (
        <SignaturePlaceholder
          onClick={onPlaceholderClick}
          onDragStart={handlePlaceholderDrag}
          style={{
            left: placeholderPosition.x - 75,
            top: placeholderPosition.y - 18,
          }}
        />
      )}

      {/* Actual signature */}
      {showSignature && (
        <div
          className="absolute cursor-move select-none z-10 border-2 border-primary border-dashed rounded-md p-1 bg-primary/5 hover:bg-primary/10 transition-colors"
          style={{
            left: signaturePosition.x - signaturePosition.width / 2,
            top: signaturePosition.y - signaturePosition.height / 2,
            width: signaturePosition.width,
          }}
          onMouseDown={handleSignatureDrag}
        >
          <img
            src={signature}
            alt="Firma"
            className="w-full h-auto pointer-events-none"
            style={{ maxHeight: signaturePosition.height - 8 }}
            draggable={false}
          />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
            <Move className="w-3 h-3" />
            Arrastra para mover
          </div>
          {/* Delete signature button */}
          <div
            className="absolute -top-2 -left-2 w-5 h-5 bg-destructive rounded-full cursor-pointer flex items-center justify-center shadow-md hover:bg-destructive/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClearSignature();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-3 h-3 text-destructive-foreground" />
          </div>
          {/* Resize handle */}
          <div
            className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-se-resize flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors"
            onMouseDown={handleSignatureResize}
          >
            <Maximize2 className="w-3 h-3 text-primary-foreground rotate-90" />
          </div>
        </div>
      )}

      {/* Instruction overlay */}
      {!signature && !placeholderPosition && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded">
          <p className="bg-secondary text-secondary-foreground px-4 py-3 rounded-lg shadow-xl font-semibold text-sm md:text-base border border-border">
            Haz clic donde deseas agregar tu firma
          </p>
        </div>
      )}
    </div>
  );
};
