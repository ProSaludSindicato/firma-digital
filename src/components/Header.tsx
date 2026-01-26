import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showFinishButton?: boolean;
  onFinish?: () => void;
  isProcessing?: boolean;
}

export const Header = ({ showFinishButton, onFinish, isProcessing }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 px-3 md:px-6 py-2 md:py-3" style={{ backgroundColor: 'hsl(220 50% 18%)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <p className="text-xs md:text-sm text-primary-foreground/90 flex-1">
          Seleccione el documento para añadir un campo
        </p>
        {showFinishButton && (
          <Button
            onClick={onFinish}
            disabled={isProcessing}
            size="sm"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold px-4 py-1 h-8"
          >
            {isProcessing ? "..." : "Finalizar"}
          </Button>
        )}
      </div>
    </header>
  );
};
