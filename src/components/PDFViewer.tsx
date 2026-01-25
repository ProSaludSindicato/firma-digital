import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, Move, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  signature: string | null;
  signaturePosition: { x: number; y: number; page: number; width: number; height: number } | null;
  onSignaturePositionChange: (position: { x: number; y: number; page: number; width: number; height: number }) => void;
  totalPages: number;
  onTotalPagesChange: (total: number) => void;
}

interface PageCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  offsetTop: number;
}

export const PDFViewer = ({
  file,
  signature,
  signaturePosition,
  onSignaturePositionChange,
  onTotalPagesChange,
}: PDFViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [pageCanvases, setPageCanvases] = useState<PageCanvas[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      onTotalPagesChange(pdf.numPages);
    };
    loadPdf();
  }, [file, onTotalPagesChange]);

  useEffect(() => {
    const renderAllPages = async () => {
      if (!pdfDoc || !pagesContainerRef.current || isRendering) return;

      setIsRendering(true);
      const container = pagesContainerRef.current;
      container.innerHTML = "";

      const canvases: PageCanvas[] = [];
      let currentOffsetTop = 0;

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = "block mx-auto shadow-md";
        canvas.dataset.page = String(pageNum);

        const context = canvas.getContext("2d");
        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "mb-4 relative";
        
        // Add page label with filename
        const pageLabel = document.createElement("div");
        pageLabel.className = "text-center text-xs text-muted-foreground py-2";
        pageLabel.textContent = `${file.name} — Página ${pageNum} de ${pdfDoc.numPages}`;
        
        wrapper.appendChild(canvas);
        wrapper.appendChild(pageLabel);
        container.appendChild(wrapper);

        canvases.push({
          canvas,
          width: viewport.width,
          height: viewport.height,
          offsetTop: currentOffsetTop,
        });

        currentOffsetTop += viewport.height + 48; // canvas + label + margin
      }

      setPageCanvases(canvases);
      setIsRendering(false);
    };

    renderAllPages();
  }, [pdfDoc, scale, file.name]);

  const getPageFromY = useCallback(
    (y: number): { page: number; relativeY: number } | null => {
      let accumulatedHeight = 0;
      for (let i = 0; i < pageCanvases.length; i++) {
        const pageHeight = pageCanvases[i].height + 48;
        if (y >= accumulatedHeight && y < accumulatedHeight + pageCanvases[i].height) {
          return { page: i + 1, relativeY: y - accumulatedHeight };
        }
        accumulatedHeight += pageHeight;
      }
      return null;
    },
    [pageCanvases]
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!signature || isDragging || isResizing || !pagesContainerRef.current) return;

      const containerRect = pagesContainerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current?.scrollTop || 0;
      
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top + scrollTop;

      const pageInfo = getPageFromY(y);
      if (pageInfo) {
        // Default signature size
        const defaultWidth = 150;
        const defaultHeight = 60;
        
        onSignaturePositionChange({
          x,
          y: pageInfo.relativeY,
          page: pageInfo.page,
          width: signaturePosition?.width || defaultWidth,
          height: signaturePosition?.height || defaultHeight,
        });
      }
    },
    [signature, isDragging, isResizing, pageCanvases, onSignaturePositionChange, getPageFromY, signaturePosition]
  );

  const handleSignatureDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const container = containerRef.current;
      const pagesContainer = pagesContainerRef.current;
      if (!container || !pagesContainer || !signaturePosition) return;

      const containerRect = pagesContainer.getBoundingClientRect();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const scrollTop = container.scrollTop || 0;
        const x = moveEvent.clientX - containerRect.left;
        const y = moveEvent.clientY - containerRect.top + scrollTop;

        const pageInfo = getPageFromY(y);
        if (pageInfo) {
          const pageCanvas = pageCanvases[pageInfo.page - 1];
          if (!pageCanvas) return;

          // Constrain to page boundaries
          const halfWidth = signaturePosition.width / 2;
          const halfHeight = signaturePosition.height / 2;

          const newX = Math.max(halfWidth, Math.min(pageCanvas.width - halfWidth, x));
          const newY = Math.max(halfHeight, Math.min(pageCanvas.height - halfHeight, pageInfo.relativeY));

          onSignaturePositionChange({
            x: newX,
            y: newY,
            page: pageInfo.page,
            width: signaturePosition.width,
            height: signaturePosition.height,
          });
        }

        // Auto-scroll
        const scrollContainerRect = container.getBoundingClientRect();
        const scrollMargin = 50;

        if (moveEvent.clientY > scrollContainerRect.bottom - scrollMargin) {
          container.scrollTop += 10;
        } else if (moveEvent.clientY < scrollContainerRect.top + scrollMargin) {
          container.scrollTop -= 10;
        }
      };

      const handleMouseUp = () => {
        setTimeout(() => setIsDragging(false), 100);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [signaturePosition, onSignaturePositionChange, pageCanvases, getPageFromY]
  );

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

        // Use the larger delta to maintain aspect ratio
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
        setTimeout(() => setIsResizing(false), 100);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [signaturePosition, onSignaturePositionChange]
  );

  const getSignatureTopPosition = useCallback(() => {
    if (!signaturePosition || !pageCanvases.length) return 0;

    let accumulatedHeight = 0;
    for (let i = 0; i < signaturePosition.page - 1; i++) {
      accumulatedHeight += pageCanvases[i].height + 48;
    }
    return accumulatedHeight + signaturePosition.y - signaturePosition.height / 2;
  }, [signaturePosition, pageCanvases]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center gap-4 bg-card rounded-lg p-2 shadow-sm border border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
        >
          <ZoomOut className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium text-foreground min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScale((s) => Math.min(2, s + 0.2))}
        >
          <ZoomIn className="w-5 h-5" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative border border-border rounded-lg overflow-auto max-h-[80vh] bg-muted/30 w-full p-4"
        onClick={handleContainerClick}
      >
        <div ref={pagesContainerRef} className="relative">
          {/* Pages are rendered here dynamically */}
        </div>

        {signature && signaturePosition && pageCanvases.length > 0 && (
          <div
            className="absolute cursor-move select-none z-10 border-2 border-primary border-dashed rounded-md p-1 bg-primary/5 hover:bg-primary/10 transition-colors"
            style={{
              left: signaturePosition.x - signaturePosition.width / 2,
              top: getSignatureTopPosition(),
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
            {/* Resize handle */}
            <div
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-se-resize flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors"
              onMouseDown={handleSignatureResize}
            >
              <Maximize2 className="w-3 h-3 text-primary-foreground rotate-90" />
            </div>
          </div>
        )}

        {signature && !signaturePosition && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/5 pointer-events-none">
            <p className="bg-card/90 text-foreground px-4 py-2 rounded-lg shadow-lg font-medium">
              Haz clic donde deseas colocar tu firma
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
