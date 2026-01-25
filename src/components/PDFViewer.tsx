import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, Move, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignaturePlaceholder } from "./SignaturePlaceholder";
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
  onSignatureCreate,
  onClearSignature,
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
  
  // New state for placeholder position (before signature is created)
  const [placeholderPosition, setPlaceholderPosition] = useState<{ x: number; y: number; page: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

        currentOffsetTop += viewport.height + 48;
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
        const canvasHeight = pageCanvases[i].height;
        
        if (y >= accumulatedHeight && y < accumulatedHeight + canvasHeight) {
          return { page: i + 1, relativeY: y - accumulatedHeight };
        }
        accumulatedHeight += pageHeight;
      }
      
      if (pageCanvases.length > 0 && y >= accumulatedHeight - 48) {
        const lastIndex = pageCanvases.length - 1;
        let totalHeight = 0;
        for (let i = 0; i < lastIndex; i++) {
          totalHeight += pageCanvases[i].height + 48;
        }
        return { 
          page: pageCanvases.length, 
          relativeY: Math.min(y - totalHeight, pageCanvases[lastIndex].height - 30) 
        };
      }
      
      return null;
    },
    [pageCanvases]
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't place new placeholder if signature already exists or if dragging/resizing
      if (signature || isDragging || isResizing || !pagesContainerRef.current || !containerRef.current) return;

      const pagesContainerRect = pagesContainerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop;
      
      const x = e.clientX - pagesContainerRect.left;
      const y = e.clientY - pagesContainerRect.top + scrollTop;

      const pageInfo = getPageFromY(y);
      if (pageInfo) {
        setPlaceholderPosition({
          x,
          y: pageInfo.relativeY,
          page: pageInfo.page,
        });
      }
    },
    [signature, isDragging, isResizing, getPageFromY]
  );

  const handlePlaceholderClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleSignatureCreate = useCallback((sig: string) => {
    onSignatureCreate(sig);
    
    // Convert placeholder position to signature position
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
  }, [placeholderPosition, onSignatureCreate, onSignaturePositionChange]);

  const handleRemoveSignature = useCallback(() => {
    onClearSignature();
    onSignaturePositionChange(null);
  }, [onClearSignature, onSignaturePositionChange]);

  const handleSignatureDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const container = containerRef.current;
      const pagesContainer = pagesContainerRef.current;
      if (!container || !pagesContainer || !signaturePosition) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const pagesContainerRect = pagesContainer.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        
        const x = moveEvent.clientX - pagesContainerRect.left;
        const y = moveEvent.clientY - pagesContainerRect.top + scrollTop;

        const pageInfo = getPageFromY(y);
        if (pageInfo) {
          const pageCanvas = pageCanvases[pageInfo.page - 1];
          if (!pageCanvas) return;

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

        const containerRect = container.getBoundingClientRect();
        const scrollMargin = 60;
        const scrollSpeed = 15;

        if (moveEvent.clientY > containerRect.bottom - scrollMargin) {
          container.scrollTop += scrollSpeed;
        } else if (moveEvent.clientY < containerRect.top + scrollMargin) {
          container.scrollTop -= scrollSpeed;
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

  const getPositionTopForPage = useCallback((page: number, relativeY: number, height: number = 0) => {
    if (!pageCanvases.length) return 0;

    let accumulatedHeight = 0;
    for (let i = 0; i < page - 1; i++) {
      accumulatedHeight += pageCanvases[i].height + 48;
    }
    return accumulatedHeight + relativeY - height / 2;
  }, [pageCanvases]);

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
        
        {signature && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveSignature}
            className="text-destructive hover:text-destructive ml-2"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar firma
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative border border-border rounded-lg overflow-auto max-h-[80vh] bg-muted/30 w-full p-4"
        onClick={handleContainerClick}
      >
        <div ref={pagesContainerRef} className="relative">
          {/* Pages are rendered here dynamically */}
        </div>

        {/* Placeholder button - shown when no signature yet */}
        {!signature && placeholderPosition && pageCanvases.length > 0 && (
          <SignaturePlaceholder
            onClick={handlePlaceholderClick}
            style={{
              left: placeholderPosition.x - 75,
              top: getPositionTopForPage(placeholderPosition.page, placeholderPosition.y),
            }}
          />
        )}

        {/* Actual signature - shown after creating */}
        {signature && signaturePosition && pageCanvases.length > 0 && (
          <div
            className="absolute cursor-move select-none z-10 border-2 border-primary border-dashed rounded-md p-1 bg-primary/5 hover:bg-primary/10 transition-colors"
            style={{
              left: signaturePosition.x - signaturePosition.width / 2,
              top: getPositionTopForPage(signaturePosition.page, signaturePosition.y, signaturePosition.height),
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
            <div
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-se-resize flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors"
              onMouseDown={handleSignatureResize}
            >
              <Maximize2 className="w-3 h-3 text-primary-foreground rotate-90" />
            </div>
          </div>
        )}

        {/* Initial instruction - before any click */}
        {!signature && !placeholderPosition && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/5 pointer-events-none">
            <p className="bg-card/90 text-foreground px-4 py-2 rounded-lg shadow-lg font-medium">
              Haz clic en el documento donde deseas agregar tu firma
            </p>
          </div>
        )}
      </div>

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSignatureCreate={handleSignatureCreate}
      />
    </div>
  );
};
