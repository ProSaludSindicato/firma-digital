import { PenLine, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePlaceholderProps {
  onClick: () => void;
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchDragStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  style: React.CSSProperties;
}

export const SignaturePlaceholder = ({ onClick, onDragStart, onTouchDragStart, style }: SignaturePlaceholderProps) => {
  return (
    <div
      className="absolute z-[15] cursor-move select-none touch-none"
      style={style}
      onMouseDown={onDragStart}
      onTouchStart={onTouchDragStart}
    >
      <div className="relative">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          variant="outline"
          className="bg-primary/10 border-primary border-2 border-dashed hover:bg-primary/20 text-primary font-medium shadow-lg pointer-events-auto"
        >
          <PenLine className="w-4 h-4 mr-2" />
          Agregar firma aquí
        </Button>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[10px] leading-tight px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
          <Move className="w-3 h-3" />
          Arrastra para mover
        </div>
      </div>
    </div>
  );
};
