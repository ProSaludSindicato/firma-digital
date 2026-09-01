import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TooltipRenderProps } from 'react-joyride';

export const TourTooltip = ({
  step,
  tooltipProps,
  primaryProps,
  backProps,
  skipProps,
  index,
  size,
  isLastStep,
}: TooltipRenderProps) => (
  <div
    {...tooltipProps}
    className="bg-background border border-border rounded-xl shadow-2xl p-5 w-[300px] max-w-[90vw] z-[9999]"
  >
    {step.title && (
      <header className="mb-4 pb-3.5 border-b border-border/70 text-center">
        <div className="flex justify-center text-base font-bold text-foreground tracking-tight leading-snug [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0">
          {step.title as React.ReactNode}
        </div>
      </header>
    )}
    <div className="text-sm text-muted-foreground leading-relaxed text-left">
      {step.content as React.ReactNode}
    </div>

    {/* Progress dots */}
    <div className="flex items-center gap-1 my-3.5">
      {Array.from({ length: size }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-200 ${
            i === index
              ? 'bg-primary w-5'
              : i < index
                ? 'bg-primary/40 w-2'
                : 'bg-muted w-2'
          }`}
        />
      ))}
      <span className="ml-auto text-[10px] text-muted-foreground/60 whitespace-nowrap">
        {index + 1} / {size}
      </span>
    </div>

    <div className="flex items-center justify-between gap-2">
      <button
        {...skipProps}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Omitir tour
      </button>
      <div className="flex items-center gap-1.5">
        {index > 0 && (
          <button
            {...backProps}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            Atrás
          </button>
        )}
        <button
          {...primaryProps}
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center gap-1 whitespace-nowrap"
        >
          {isLastStep ? '¡Entendido!' : 'Siguiente'}
          {!isLastStep && <ChevronRight className="w-3 h-3" />}
        </button>
      </div>
    </div>
  </div>
);
