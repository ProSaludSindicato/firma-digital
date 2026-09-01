import type { DocumentField, DateFieldValue } from "@/types/documentEditor";

const DEFAULT_DISPLAY_FORMAT = "dd/MM/yyyy";

interface DateFieldProps {
  field: DocumentField;
  isLocked: boolean;
  onChangeValue: (value: DateFieldValue | null) => void;
}

function formatDisplayDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DateField({ field, isLocked, onChangeValue }: DateFieldProps) {
  const isoDate = field.value?.type === "date" ? field.value.isoDate : "";

  const fontStyle: React.CSSProperties = {
    fontSize: "clamp(8px, 72cqh, 48px)",
    lineHeight: 1.1,
  };

  if (isLocked) {
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1 text-foreground"
        style={fontStyle}
      >
        <span className="truncate">
          {isoDate ? formatDisplayDate(isoDate) : field.label}
        </span>
      </div>
    );
  }

  return (
    <input
      data-no-drag
      type="date"
      aria-label={field.label}
      value={isoDate}
      onChange={(event) => {
        const next = event.target.value;
        onChangeValue(
          next
            ? {
                type: "date",
                isoDate: next,
                displayFormat: DEFAULT_DISPLAY_FORMAT,
              }
            : null,
        );
      }}
      onClick={(event) => event.stopPropagation()}
      className="h-full w-full min-w-0 appearance-none bg-transparent px-1 text-foreground outline-none [color-scheme:light]"
      style={fontStyle}
    />
  );
}
