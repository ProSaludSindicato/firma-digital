import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SigningActionBarProps {
  children: ReactNode;
  className?: string;
}

/** Barra inferior integrada al visor (sombra suave, ancho completo). */
export function SigningActionBar({ children, className }: SigningActionBarProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/50 bg-white",
        "shadow-[0_-10px_28px_-12px_rgba(15,23,42,0.14)]",
        className,
      )}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-2xl px-3 py-3 sm:px-4 sm:py-3.5">
        {children}
      </div>
    </div>
  );
}
