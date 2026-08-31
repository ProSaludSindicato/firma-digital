import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoGrowFieldWidth } from "@/hooks/useAutoGrowFieldWidth";
import { resizeFieldToContent } from "@/lib/fieldAutoWidth";
import { cn } from "@/lib/utils";
import type { DocumentField, TextFieldValue } from "@/types/documentEditor";

interface TextFieldProps {
  field: DocumentField;
  isSelected: boolean;
  isLocked: boolean;
  scaleRatio: number;
  isMobile?: boolean;
  onChangeValue: (value: TextFieldValue | null) => void;
  onResizeWidth: (width: number) => void;
}

const FIELD_TEXT_STYLE: React.CSSProperties = {
  fontSize: "clamp(8px, 72cqh, 96px)",
  lineHeight: 1.15,
};

export function TextField({
  field,
  isSelected,
  isLocked,
  scaleRatio,
  isMobile = false,
  onChangeValue,
  onResizeWidth,
}: TextFieldProps) {
  const text = field.value?.type === "text" ? field.value.text : "";
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = field.label;

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
    setDraft(text);
  }, [text]);

  useEffect(() => {
    if (isSelected && !isLocked) {
      inputRef.current?.focus();
    }
  }, [isSelected, isLocked]);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      measureRef.current = node;
    },
    [measureRef],
  );

  const commit = (next: string) => {
    const trimmed = next.trim();
    onChangeValue(trimmed ? { type: "text", text: next } : null);
  };

  if (isLocked) {
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1 text-foreground whitespace-nowrap"
        style={FIELD_TEXT_STYLE}
      >
        <span className="truncate">{text || field.label}</span>
      </div>
    );
  }

  return (
    <input
      ref={setRefs}
      type="text"
      data-no-drag
      value={draft}
      aria-label={field.label}
      placeholder={placeholder}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        onChangeValue(next.trim() ? { type: "text", text: next } : null);
        resizeNow(next);
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
        "h-full min-w-0 w-full bg-transparent px-1 py-0 text-foreground",
        "whitespace-nowrap outline-none placeholder:text-muted-foreground/70",
      )}
      style={FIELD_TEXT_STYLE}
    />
  );
}
