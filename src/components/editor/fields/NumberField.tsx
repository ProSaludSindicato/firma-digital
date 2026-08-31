import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoGrowFieldWidth } from "@/hooks/useAutoGrowFieldWidth";
import { resizeFieldToContent } from "@/lib/fieldAutoWidth";
import { getNumberFieldPlaceholder } from "@/lib/fieldDefaults";
import { cn } from "@/lib/utils";
import type { DocumentField, NumberFieldValue } from "@/types/documentEditor";

interface NumberFieldProps {
  field: DocumentField;
  isSelected: boolean;
  isLocked: boolean;
  scaleRatio: number;
  isMobile?: boolean;
  onChangeValue: (value: NumberFieldValue | null) => void;
  onResizeWidth: (width: number) => void;
}

const FIELD_TEXT_STYLE: React.CSSProperties = {
  fontSize: "clamp(8px, 72cqh, 96px)",
  lineHeight: 1.15,
  fontVariantNumeric: "tabular-nums",
};

function sanitizeNumericInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function NumberField({
  field,
  isSelected,
  isLocked,
  scaleRatio,
  isMobile = false,
  onChangeValue,
  onResizeWidth,
}: NumberFieldProps) {
  const stored =
    field.value?.type === "number" ? field.value.value : "";
  const [draft, setDraft] = useState(stored);
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = getNumberFieldPlaceholder(field.label);

  const handleResizeWidth = useCallback(
    (width: number) => {
      onResizeWidth(width);
    },
    [onResizeWidth],
  );

  const measureRef = useAutoGrowFieldWidth(
    field,
    draft,
    placeholder,
    scaleRatio,
    isMobile,
    handleResizeWidth,
  );

  const resizeNow = useCallback(
    (nextDraft: string) => {
      const element = inputRef.current;
      if (!element) {
        return;
      }
      resizeFieldToContent(
        element,
        field,
        nextDraft,
        placeholder,
        scaleRatio,
        isMobile,
        handleResizeWidth,
      );
    },
    [field, handleResizeWidth, isMobile, placeholder, scaleRatio],
  );

  useEffect(() => {
    setDraft(stored);
  }, [stored]);

  useEffect(() => {
    if (isSelected && !isLocked) {
      inputRef.current?.focus();
    }
  }, [isSelected, isLocked]);

  useEffect(() => {
    resizeNow(draft);
  }, [draft, field.width, resizeNow]);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      measureRef.current = node;
    },
    [measureRef],
  );

  const commit = (next: string) => {
    const sanitized = sanitizeNumericInput(next);
    onChangeValue(sanitized ? { type: "number", value: sanitized } : null);
  };

  if (isLocked) {
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1 text-foreground tabular-nums whitespace-nowrap"
        style={FIELD_TEXT_STYLE}
      >
        <span className="truncate">{stored || field.label}</span>
      </div>
    );
  }

  return (
    <input
      ref={setRefs}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      data-no-drag
      value={draft}
      aria-label={field.label}
      placeholder={placeholder}
      onChange={(event) => {
        const sanitized = sanitizeNumericInput(event.target.value);
        setDraft(sanitized);
        onChangeValue(sanitized ? { type: "number", value: sanitized } : null);
        resizeNow(sanitized);
      }}
      onBlur={() => commit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "h-full min-w-0 w-full bg-transparent px-1 py-0 text-foreground tabular-nums",
        "whitespace-nowrap outline-none placeholder:text-muted-foreground/70",
      )}
      style={FIELD_TEXT_STYLE}
    />
  );
}
