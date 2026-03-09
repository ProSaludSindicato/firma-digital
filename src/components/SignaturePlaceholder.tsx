import { PenLine } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignaturePlaceholderProps {
  onClick: () => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchDragStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  style: React.CSSProperties;
}

export const SignaturePlaceholder = ({ onClick, onDragStart, onTouchDragStart, style }: SignaturePlaceholderProps) => {
  const isMobile = useIsMobile();

  return (
    <div
      className="absolute z-[15] cursor-move select-none touch-none"
      style={style}
      onMouseDown={onDragStart}
      onTouchStart={onTouchDragStart}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`flex items-center gap-1.5 bg-primary/5 dark:bg-primary/10 border-2 border-primary/60 border-dashed rounded-lg shadow-sm cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/15 hover:border-primary transition-colors pointer-events-auto ${
          isMobile ? "h-9 px-3 py-1.5" : "h-11 px-4 py-2"
        }`}
      >
        <PenLine className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap">
          {isMobile ? "Firmar" : "Firma aquí"}
        </span>
      </div>
    </div>
  );
};
