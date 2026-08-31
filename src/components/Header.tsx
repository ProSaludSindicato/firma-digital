import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { FieldProgressChips } from "@/components/editor/FieldProgressChips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FieldProgressCounts } from "@/lib/fieldValidation";

interface HeaderProps {
  showFinishButton?: boolean;
  onFinish?: () => void;
  isProcessing?: boolean;
  isSent?: boolean;
  /** Texto centrado; el valor por defecto del producto vive en `appConfig`, no aquí. */
  title: string;
  /** Subtítulo bajo el título (p. ej. paginación). */
  subtitle?: string;
  /** Progreso de campos para chips de completos/pendientes. */
  fieldProgress?: FieldProgressCounts;
  /** Deshabilita envío/exportar (sin contar procesamiento). */
  finishDisabled?: boolean;
  /** Tooltip cuando el botón de envío está deshabilitado. */
  finishDisabledTitle?: string;
  /** Logotipo junto al título (izquierda, tamaño grande) y cabecera en blanco. */
  brandLogoSrc?: string;
  brandLogoAlt?: string;
  finishLabel?: string;
  finishIcon?: ReactNode;
  /** Ícono de documento a la izquierda del título. */
  showDocumentIcon?: boolean;
  /** Variante de layout para el editor de documentos. */
  variant?: "default" | "document";
}

export const Header = ({
  showFinishButton,
  onFinish,
  isProcessing,
  isSent,
  title,
  subtitle,
  fieldProgress,
  finishDisabled = false,
  finishDisabledTitle,
  brandLogoSrc,
  brandLogoAlt = "ProSalud",
  finishLabel = "Enviar",
  finishIcon,
  showDocumentIcon = false,
  variant = "default",
}: HeaderProps) => {
  const hasBrandRow = Boolean(brandLogoSrc);
  const isDocumentVariant = variant === "document" && !hasBrandRow;
  const resolvedFinishIcon = finishIcon ?? (
    finishLabel.toLowerCase().includes("enviar") ? (
      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
    ) : null
  );
  const isFinishBlocked = finishDisabled || isProcessing;
  const hasMetaRow = Boolean(subtitle || fieldProgress);

  const finishButton =
    showFinishButton && !isSent ? (
      <Button
        id="tour-header-send"
        onClick={onFinish}
        disabled={isFinishBlocked}
        size="default"
        title={
          isFinishBlocked && finishDisabledTitle
            ? finishDisabledTitle
            : undefined
        }
        className={cn(
          "h-9 w-full shrink-0 gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-sm",
          "sm:h-11 sm:w-auto sm:gap-2.5 sm:px-6 sm:text-base sm:font-bold sm:shadow-md",
          "md:h-12 md:px-8",
          finishDisabled &&
            !isProcessing &&
            "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60",
        )}
      >
        {resolvedFinishIcon}
        {isProcessing ? "Procesando..." : finishLabel}
      </Button>
    ) : null;

  if (isDocumentVariant) {
    return (
      <header className="sticky top-0 z-50 shrink-0 border-b border-border/40 bg-white">
        <div className="mx-auto w-full max-w-7xl px-3 py-2.5 sm:px-5 sm:py-3.5">
          <div
            className={cn(
              "grid gap-x-2.5 gap-y-1.5 sm:items-center sm:gap-x-3",
              showDocumentIcon
                ? "grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto]"
                : "grid-cols-[1fr] sm:grid-cols-[1fr_auto]",
            )}
          >
            {showDocumentIcon ? (
              <div
                className="col-start-1 row-start-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary sm:h-10 sm:w-10"
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            ) : null}

            <h1
              className={cn(
                "min-w-0 truncate font-serif text-sm font-semibold leading-tight text-foreground sm:text-lg",
                showDocumentIcon ? "col-start-2" : "col-start-1",
                "row-start-1",
              )}
              title={title}
            >
              {title}
            </h1>

            {hasMetaRow ? (
              <div
                className={cn(
                  "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 row-start-2 sm:gap-x-0",
                  showDocumentIcon ? "col-start-2" : "col-start-1",
                )}
              >
                {subtitle ? (
                  <p className="shrink-0 text-[11px] text-muted-foreground sm:text-xs">
                    {subtitle}
                  </p>
                ) : null}
                {subtitle && fieldProgress ? (
                  <span
                    className="mx-2 hidden h-3.5 w-px shrink-0 bg-border/70 sm:mx-4 sm:block md:mx-6"
                    aria-hidden
                  />
                ) : null}
                {fieldProgress ? (
                  <FieldProgressChips progress={fieldProgress} />
                ) : null}
              </div>
            ) : null}

            {finishButton ? (
              <div
                className={cn(
                  "row-start-3 w-full sm:row-start-1 sm:w-auto sm:justify-self-end",
                  showDocumentIcon
                    ? "col-span-2 col-start-1 sm:col-span-1 sm:col-start-3"
                    : "col-start-1 sm:col-start-2",
                  !hasMetaRow && "row-start-2 sm:row-start-1",
                )}
              >
                {finishButton}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={
        hasBrandRow
          ? "sticky top-0 z-50 border-b border-border/40 bg-white dark:bg-white"
          : "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40"
      }
    >
      <div
        className={
          hasBrandRow
            ? "relative max-w-7xl mx-auto w-full flex items-center min-h-[3.5rem] md:min-h-[3.75rem] px-3 md:px-5 py-2 gap-2 md:gap-4"
            : "relative max-w-7xl mx-auto h-10 md:h-11 min-h-10 md:min-h-[2.75rem] px-3 md:px-5"
        }
      >
        {hasBrandRow ? (
          <div className="grid min-h-[3.5rem] w-full grid-cols-3 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3 md:px-5">
            <div className="flex min-h-0 min-w-0 items-center justify-start">
              <img
                src={brandLogoSrc}
                alt={brandLogoAlt}
                className="h-10 max-h-[2.85rem] w-auto max-w-full object-contain object-left sm:max-h-[3.25rem] md:h-[3.75rem] md:max-h-[4.25rem]"
              />
            </div>
            <p
              className="min-w-0 text-center text-xs font-semibold leading-snug text-foreground sm:text-sm sm:leading-snug md:text-base md:leading-snug pointer-events-none text-balance [overflow-wrap:anywhere]"
              title={title}
            >
              {title}
            </p>
            <div className="flex min-h-0 min-w-0 items-center justify-end">
              {showFinishButton && !isSent ? (
                <Button
                  id="tour-header-send"
                  onClick={onFinish}
                  disabled={isProcessing}
                  size="sm"
                  className="h-7 px-3 text-xs font-medium sm:px-4"
                >
                  {isProcessing ? "Procesando..." : finishLabel}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <p
              className={cn(
                "absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center text-xs md:text-sm text-foreground font-semibold truncate px-3 pointer-events-none",
                showFinishButton && !isSent
                  ? "max-w-[calc(100%-8rem)]"
                  : "max-w-[min(100%,42rem)]",
              )}
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
                {isProcessing ? "Procesando..." : finishLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
};
