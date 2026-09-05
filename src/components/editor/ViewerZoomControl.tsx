import { Minus, Plus, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewerZoomControlProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export function ViewerZoomControl({
  scale,
  onZoomIn,
  onZoomOut,
  minScale = 0.5,
  maxScale = 3,
  className,
}: ViewerZoomControlProps) {
  const atMin = scale <= minScale + 0.001;
  const atMax = scale >= maxScale - 0.001;

  return (
    <div
      id="tour-pdf-toolbar-zoom"
      role="group"
      aria-label="Zoom del documento"
      className={cn(
        "pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 sm:bottom-4",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full border border-border/70",
          "bg-white/95 px-1 py-1 shadow-lg backdrop-blur-sm",
          "ring-1 ring-black/[0.04]",
        )}
      >
        <span className="sr-only">Ampliar documento</span>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-9 sm:w-9"
          aria-hidden
        >
          <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.25} />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          disabled={atMin}
          aria-label="Alejar"
          className="h-8 w-8 rounded-full sm:h-9 sm:w-9"
        >
          <Minus className="h-4 w-4" strokeWidth={2.5} />
        </Button>

        <span
          className="min-w-[2.75rem] px-0.5 text-center text-xs font-bold tabular-nums text-primary sm:min-w-[3rem] sm:text-sm"
          aria-live="polite"
          aria-atomic="true"
        >
          {Math.round(scale * 100)}%
        </span>

        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={onZoomIn}
          disabled={atMax}
          aria-label="Acercar"
          className="h-8 w-8 rounded-full shadow-sm sm:h-9 sm:w-9"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
