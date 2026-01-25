import { useEffect, useState } from "react";
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
}

export const PDFThumbnails = ({
  pdfDoc,
  currentPage,
  onPageSelect,
  signaturePage,
  isCollapsed,
  onToggle,
}: PDFThumbnailsProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    const generateThumbnails = async () => {
      if (!pdfDoc) return;

      const thumbs: string[] = [];
      const scale = 0.3;

      for (let i = 1; i <= pdfDoc.numPages; i++) {
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
      }

      setThumbnails(thumbs);
    };

    generateThumbnails();
  }, [pdfDoc]);

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

  if (!pdfDoc || thumbnails.length === 0) {
    return (
      <div className="w-24 md:w-32 bg-muted/50 border-r border-border flex flex-col">
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
    <div className="w-24 md:w-32 bg-muted/50 border-r border-border flex flex-col">
      <div className="p-2 border-b border-border flex justify-end">
        {ToggleButton}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {thumbnails.map((thumb, index) => (
            <button
              key={index}
              onClick={() => onPageSelect(index + 1)}
              className={cn(
                "w-full relative rounded border-2 overflow-hidden transition-all hover:border-primary/50",
                currentPage === index + 1
                  ? "border-primary shadow-md"
                  : "border-transparent"
              )}
            >
              <img
                src={thumb}
                alt={`Página ${index + 1}`}
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-xs py-0.5 text-center font-medium">
                {index + 1}
              </div>
              {signaturePage === index + 1 && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
