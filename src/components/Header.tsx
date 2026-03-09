import { Button } from "@/components/ui/button";

interface HeaderProps {
  showFinishButton?: boolean;
  onFinish?: () => void;
  isProcessing?: boolean;
  isSent?: boolean;
  title?: string;
}

export const Header = ({ showFinishButton, onFinish, isProcessing, isSent, title = "Convenio de afiliación ProSalud" }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 md:px-6 h-12 md:h-14">
        <p className="text-sm md:text-base text-foreground font-semibold truncate">
          {title}
        </p>
        {showFinishButton && !isSent && (
          <Button
            onClick={onFinish}
            disabled={isProcessing}
            size="sm"
            className="font-medium px-5 h-8"
          >
            {isProcessing ? "Procesando..." : "Enviar"}
          </Button>
        )}
      </div>
    </header>
  );
};
