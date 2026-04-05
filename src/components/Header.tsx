import { Button } from "@/components/ui/button";

interface HeaderProps {
  showFinishButton?: boolean;
  onFinish?: () => void;
  isProcessing?: boolean;
  isSent?: boolean;
  /** Texto centrado; el valor por defecto del producto vive en `appConfig`, no aquí. */
  title: string;
}

export const Header = ({ showFinishButton, onFinish, isProcessing, isSent, title }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="relative max-w-7xl mx-auto h-10 md:h-11 min-h-10 md:min-h-[2.75rem] px-3 md:px-5">
        <p
          className={`absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center text-xs md:text-sm text-foreground font-semibold truncate px-3 pointer-events-none ${
            showFinishButton && !isSent ? "max-w-[calc(100%-8rem)]" : "max-w-[min(100%,42rem)]"
          }`}
          title={title}
        >
          {title}
        </p>

        {showFinishButton && !isSent && (
          <Button
            id="tour-header-send"
            onClick={onFinish}
            disabled={isProcessing}
            size="sm"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 font-medium px-4 h-7 text-xs z-10"
          >
            {isProcessing ? "Procesando..." : "Enviar"}
          </Button>
        )}
      </div>
    </header>
  );
};
