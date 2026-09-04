import { Signature } from "lucide-react";
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
        "flex h-full w-full items-center justify-center gap-1 px-1.5 md:gap-1.5",
        "text-[#9A6314] transition-colors hover:bg-[#B8791A]/10",
        "text-[length:clamp(8px,12cqw,14px)] md:text-[length:clamp(11px,15cqw,17px)]",
      )}
      aria-label={`Dibujar ${field.label}`}
    >
      <Signature
        className="size-[1.2em] shrink-0 md:size-[1.35em]"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="min-w-0 font-medium leading-none">
        Firma aquí
      </span>
    </button>
  );
}
