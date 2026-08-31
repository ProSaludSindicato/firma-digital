import { cn } from "@/lib/utils";
import type { FieldProgressCounts } from "@/lib/fieldValidation";

interface FieldProgressChipsProps {
  progress: FieldProgressCounts;
  className?: string;
}

function fieldWord(count: number): string {
  return count === 1 ? "campo" : "campos";
}

export function FieldProgressChips({
  progress,
  className,
}: FieldProgressChipsProps) {
  const { total, completed, pending } = progress;

  if (total === 0) {
    return (
      <span
        className={cn(
          "rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:px-2.5 sm:py-1 sm:text-xs",
          className,
        )}
      >
        Sin campos aún
      </span>
    );
  }

  const completedLabel = `${completed} ${fieldWord(completed)} completo${completed === 1 ? "" : "s"}`;
  const pendingLabel = `${pending} ${fieldWord(pending)} pendiente${pending === 1 ? "" : "s"}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2", className)}>
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground sm:hidden">
        Campos:
      </span>
      <span
        className="rounded-full bg-[#E3EFEA] px-2 py-0.5 text-[10px] font-medium text-[#0B5347] sm:px-2.5 sm:py-1 sm:text-xs"
        title={completedLabel}
      >
        <span className="sm:hidden">{completed} ✓</span>
        <span className="hidden sm:inline">{completedLabel}</span>
      </span>
      {pending > 0 ? (
        <span
          className="rounded-full bg-[#FBEEDD] px-2 py-0.5 text-[10px] font-medium text-[#B8791A] sm:px-2.5 sm:py-1 sm:text-xs"
          title={pendingLabel}
        >
          <span className="sm:hidden">{pending} pend.</span>
          <span className="hidden sm:inline">{pendingLabel}</span>
        </span>
      ) : null}
    </div>
  );
}
