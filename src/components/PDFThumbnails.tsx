import { useEffect, useState, useCallback, memo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeft } from "lucide-react";

interface PDFThumbnailsProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  onPageSelect: (page: number) => void;
  signaturePage: number | null;
  isCollapsed: boolean;
  onToggle: () => void;
  documentScale: number; // Scale of the main document to make thumbnails proportional
}

const PDFThumbnailsComponent = ({
  pdfDoc,
  currentPage,
  onPageSelect,
  signaturePage,
  isCollapsed,
  onToggle,
  documentScale,
}: PDFThumbnailsProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    const generateThumbnails = async () => {
      if (!pdfDoc) return;

      const thumbs: string[] = [];
      // Calculate thumbnail scale proportionally to document scale
      // Base scale increased significantly to make thumbnails appear much larger
      // With zoom 160% (1.6), this will produce: 0.86 * 1.6 = 1.376 (larger than previous 200% zoom size)
      const baseThumbnailScale = 0.86;
      const scale = baseThumbnailScale * documentScale;
      const numPages = pdfDoc.numPages;

      // Generate thumbnails with error handling
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const context = canvas.getContext("2d");
          if (context) {
            await page.render({
              canvasContext: context,
              viewport,
            }).promise;
          }

          thumbs.push(canvas.toDataURL());
        } catch (error) {
          console.error(`Error generando miniatura para página ${i}:`, error);
          // Push placeholder for failed thumbnails
          thumbs.push('');
        }
      }

      setThumbnails(thumbs);
    };

    generateThumbnails();
  }, [pdfDoc, documentScale]);

  // Scroll to current page thumbnail when it changes
  useEffect(() => {
    if (thumbnails.length > 0 && currentPage > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const thumbnailElement = document.querySelector(
          `[data-thumbnail-page="${currentPage}"]`
        );
        if (thumbnailElement) {
          thumbnailElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }, 100);
    }
  }, [currentPage, thumbnails.length]);

  // Toggle button always visible
  const ToggleButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="h-8 w-8 shrink-0"
      title={isCollapsed ? "Mostrar miniaturas" : "Ocultar miniaturas"}
    >
      {isCollapsed ? (
        <PanelLeft className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  );

  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center py-2 px-1 bg-muted/50 border-r border-border w-10">
        {ToggleButton}
      </div>
    );
  }

  // Calculate sidebar width proportionally to document scale
  // Base width is 96px (w-24), scales up with document zoom
  // Increased max width to 240px to accommodate larger thumbnails
  const baseWidth = 96; // w-24 = 96px
  const sidebarWidth = Math.min(240, Math.max(96, baseWidth * documentScale));

  if (!pdfDoc || thumbnails.length === 0) {
    return (
      <div 
        className="bg-muted/50 border-r border-border flex flex-col"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-2 border-b border-border flex justify-end">
          {ToggleButton}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-muted/50 border-r border-border flex flex-col h-full"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="p-2 border-b border-border flex justify-end shrink-0">
        {ToggleButton}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {thumbnails.map((thumb, index) => (
            <button
              key={index}
              data-thumbnail-page={index + 1}
              onClick={() => onPageSelect(index + 1)}
              className={cn(
                "w-full relative rounded border-2 overflow-hidden transition-all hover:border-primary/50 flex-shrink-0",
                currentPage === index + 1
                  ? "border-primary shadow-md"
                  : "border-transparent"
              )}
            >
              {thumb ? (
                <>
                  <img
                    src={thumb}
                    alt={`Página ${index + 1}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-xs py-0.5 text-center font-medium">
                    {index + 1}
                  </div>
                  {signaturePage === index + 1 && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                  )}
                </>
              ) : (
                <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Error</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const PDFThumbnails = memo(PDFThumbnailsComponent, (prevProps, nextProps) => {
  return (
    prevProps.pdfDoc === nextProps.pdfDoc &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.signaturePage === nextProps.signaturePage &&
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.documentScale === nextProps.documentScale &&
    prevProps.onPageSelect === nextProps.onPageSelect &&
    prevProps.onToggle === nextProps.onToggle
  );
});
