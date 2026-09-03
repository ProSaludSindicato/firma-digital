import { PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentField } from "@/types/documentEditor";

interface SignatureFieldProps {
  field: DocumentField;
  isLocked: boolean;
  onRequestEdit: () => void;
}

export function SignatureField({
  field,
  isLocked,
  onRequestEdit,
}: SignatureFieldProps) {
  const dataUrl =
    field.value?.type === "signature" ? field.value.dataUrl : null;

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={field.label}
        className="block h-full w-full object-contain pointer-events-none"
        draggable={false}
      />
    );
  }

  return (
    <button
      type="button"
      data-no-drag
      onClick={(event) => {
        event.stopPropagation();
        if (!isLocked) {
          onRequestEdit();
        }
      }}
      className={cn(
        "flex h-full w-full items-center justify-center gap-1.5 px-2",
        "text-[#9A6314] transition-colors hover:bg-[#B8791A]/10",
      )}
      aria-label={`Dibujar ${field.label}`}
    >
      <PenLine className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-[11px] font-medium sm:text-xs">
        Firma aquí
      </span>
    </button>
  );
}
