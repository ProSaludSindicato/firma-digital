import { Minus, Plus } from "lucide-react";
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
  maxScale = 2,
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
        "viewer-zoom-glass fixed z-40",
        "right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
        "lg:right-5 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2",
        className,
      )}
    >
      <div className="viewer-zoom-glass__inner">
        <button
          type="button"
          onClick={onZoomIn}
          disabled={atMax}
          aria-label="Acercar"
          className="viewer-zoom-btn"
        >
          <Plus className="h-[17px] w-[17px]" strokeWidth={2.25} aria-hidden />
        </button>

        <div className="viewer-zoom-glass__divider" aria-hidden />

        <span
          className="viewer-zoom-glass__label"
          aria-live="polite"
          aria-atomic="true"
        >
          {Math.round(scale * 100)}%
        </span>

        <div className="viewer-zoom-glass__divider" aria-hidden />

        <button
          type="button"
          onClick={onZoomOut}
          disabled={atMin}
          aria-label="Alejar"
          className="viewer-zoom-btn"
        >
          <Minus className="h-[17px] w-[17px]" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
