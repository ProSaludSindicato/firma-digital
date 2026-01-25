import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PDFThumbnailsProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  onPageSelect: (page: number) => void;
  signaturePage: number | null;
}

export const PDFThumbnails = ({
  pdfDoc,
  currentPage,
  onPageSelect,
  signaturePage,
}: PDFThumbnailsProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  if (!pdfDoc || thumbnails.length === 0) {
    return (
      <div className="w-24 md:w-32 bg-muted/50 border-r border-border flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="w-24 md:w-32 bg-muted/50 border-r border-border">
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
  );
};
