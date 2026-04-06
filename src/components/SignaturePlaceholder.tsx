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
        className={`flex items-center bg-primary/5 dark:bg-primary/10 border-2 border-primary/60 border-dashed rounded-md sm:rounded-lg shadow-sm cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/15 hover:border-primary transition-colors pointer-events-auto ${
          isMobile
            ? "gap-1 h-8 px-2 py-1 max-[420px]:h-7 max-[420px]:px-1.5 max-[420px]:gap-0.5"
            : "gap-1.5 h-11 px-4 py-2"
        }`}
      >
        <PenLine
          className={`text-primary flex-shrink-0 ${isMobile ? "w-3.5 h-3.5 max-[420px]:w-3 max-[420px]:h-3" : "w-4 h-4"}`}
        />
        <span
          className={`font-medium text-primary whitespace-nowrap ${isMobile ? "text-[10px] max-[420px]:text-[9px]" : "text-xs sm:text-sm"}`}
        >
          {isMobile ? "Firmar" : "Firma aquí"}
        </span>
      </div>
    </div>
  );
};
