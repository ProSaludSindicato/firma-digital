import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePlaceholderProps {
  onClick: () => void;
  style: React.CSSProperties;
}

export const SignaturePlaceholder = ({ onClick, style }: SignaturePlaceholderProps) => {
  return (
    <div
      className="absolute z-[15] cursor-pointer"
      style={style}
    >
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        variant="outline"
        className="bg-primary/10 border-primary border-2 border-dashed hover:bg-primary/20 text-primary font-medium shadow-lg"
      >
        <PenLine className="w-4 h-4 mr-2" />
        Agregar firma aquí
      </Button>
    </div>
  );
};
