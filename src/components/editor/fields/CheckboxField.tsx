import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckboxFieldValue, DocumentField } from "@/types/documentEditor";

interface CheckboxFieldProps {
  field: DocumentField;
  isLocked: boolean;
  onChangeValue: (value: CheckboxFieldValue) => void;
}

export function CheckboxField({
  field,
  isLocked,
  onChangeValue,
}: CheckboxFieldProps) {
  const checked =
    field.value?.type === "checkbox" ? field.value.checked : false;

  return (
    <button
      type="button"
      data-no-drag
      role="checkbox"
      aria-checked={checked}
      aria-label={field.label}
      disabled={isLocked}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={() => {
        if (!isLocked) {
          onChangeValue({ type: "checkbox", checked: !checked });
        }
      }}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-[2px] bg-transparent",
        isLocked ? "cursor-default" : "cursor-pointer",
      )}
    >
      {checked ? (
        <Check className="h-[70%] w-[70%] text-primary" strokeWidth={3} />
      ) : null}
    </button>
  );
}
