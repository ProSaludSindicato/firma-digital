import { Info, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showFinishButton?: boolean;
  onFinish?: () => void;
  isProcessing?: boolean;
}

export const Header = ({ showFinishButton, onFinish, isProcessing }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 px-6 py-4" style={{ backgroundColor: 'hsl(220 50% 18%)' }}>
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm md:text-base text-primary-foreground font-semibold">
            La firma se realiza en la página 2 del documento.
          </h2>
          <p className="text-xs md:text-sm text-primary-foreground/80">
            Haga clic en el área marcada para agregar su firma (dibujándola o subiendo una imagen).
          </p>
        </div>
        {showFinishButton && (
          <Button
            onClick={onFinish}
            disabled={isProcessing}
            size="sm"
            variant="secondary"
            className="hidden sm:flex"
          >
            <Send className="w-4 h-4 mr-1" />
            {isProcessing ? "Procesando..." : "Finalizar y Enviar"}
          </Button>
        )}
      </div>
    </header>
  );
};
