import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  signature: string | null;
  signaturePosition: { x: number; y: number } | null;
  onSignaturePositionChange: (position: { x: number; y: number }) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  onTotalPagesChange: (total: number) => void;
}

export const PDFViewer = ({
  file,
  signature,
  signaturePosition,
  onSignaturePositionChange,
  currentPage,
  onPageChange,
  totalPages,
  onTotalPagesChange,
}: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setCanvasSize({ width: viewport.width, height: viewport.height });

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    };
    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!signature || isDragging) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      onSignaturePositionChange({ x, y });
    },
    [signature, isDragging, onSignaturePositionChange]
  );

  const handleSignatureDrag = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      e.preventDefault();
      setIsDragging(true);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = signaturePosition?.x || 0;
      const startPosY = signaturePosition?.y || 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        onSignaturePositionChange({
          x: startPosX + deltaX,
          y: startPosY + deltaY,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [signaturePosition, onSignaturePositionChange]
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center gap-4 bg-card rounded-lg p-2 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
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
        className="relative border border-border rounded-lg overflow-auto max-h-[70vh] bg-muted/30"
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="block" />
        {signature && signaturePosition && (
          <img
            src={signature}
            alt="Firma"
            className="absolute cursor-move select-none"
            style={{
              left: signaturePosition.x - 75,
              top: signaturePosition.y - 25,
              width: 150,
              height: "auto",
              maxHeight: 80,
            }}
            onMouseDown={handleSignatureDrag}
            draggable={false}
          />
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
