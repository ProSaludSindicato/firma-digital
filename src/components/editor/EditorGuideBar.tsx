import { Info } from "lucide-react";
import { FIELD_TYPE_LABELS, getPlacementHint } from "@/lib/fieldDefaults";
import type { FieldType } from "@/types/documentEditor";

interface EditorGuideBarProps {
  /** Muestra el hint neutro cuando no hay herramienta activa. */
  showDefaultHint?: boolean;
  placingType: FieldType | null;
  constrainedPage?: number;
  isOnConstrainedPage?: boolean;
  pendingFieldLabel?: string;
  lockedPlacement?: boolean;
  onCancel?: () => void;
  onNavigate?: () => void;
}

export function EditorGuideBar({
  showDefaultHint = true,
  placingType,
  constrainedPage,
  isOnConstrainedPage = true,
  pendingFieldLabel,
  lockedPlacement = false,
  onCancel,
  onNavigate,
}: EditorGuideBarProps) {
  if (lockedPlacement && pendingFieldLabel) {
    return (
      <div className="shrink-0 border-b border-amber-200/60 bg-[#fff5e6] px-4 py-2 text-center text-xs text-[#7d5a2d] sm:text-sm">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
          <Info className="inline h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span>Completa el campo “{pendingFieldLabel}”</span>
        </span>
      </div>
    );
  }

  if (placingType) {
    const needsNavigation = constrainedPage != null && !isOnConstrainedPage;
    const message = needsNavigation
      ? `Ve a la página ${constrainedPage} para colocar ${FIELD_TYPE_LABELS[placingType].toLowerCase()}`
      : `Toca el documento donde va ${getPlacementHint(placingType)}.`;

    return (
      <div className="shrink-0 border-b border-amber-200/60 bg-[#fff5e6] px-4 py-2 text-center text-xs text-[#7d5a2d] sm:text-sm">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
          <Info className="inline h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span>{message}</span>
          {needsNavigation && onNavigate ? (
            <button
              type="button"
              onClick={onNavigate}
              className="font-medium underline underline-offset-2 hover:text-[#5c4220]"
            >
              Ir a la página
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="font-medium underline underline-offset-2 hover:text-[#5c4220]"
            >
              Cancelar
            </button>
          ) : null}
        </span>
      </div>
    );
  }

  if (!showDefaultHint) {
    return null;
  }

  return (
    <div className="shrink-0 border-b border-amber-200/60 bg-[#fff5e6] px-4 py-2 text-center text-xs text-[#7d5a2d] sm:text-sm">
      <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
        <Info className="inline h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <span>
          Elige un tipo de campo abajo y luego toca el documento donde quieras
          colocarlo.
        </span>
      </span>
    </div>
  );
}
