import { CalendarDays, CheckSquare, Hash, PenLine, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_LABELS } from "@/lib/fieldDefaults";
import type { FieldType } from "@/types/documentEditor";

const FIELD_TOOLS: {
  type: FieldType;
  icon: typeof PenLine;
}[] = [
  { type: "signature", icon: PenLine },
  { type: "text", icon: Type },
  { type: "number", icon: Hash },
  { type: "date", icon: CalendarDays },
  { type: "checkbox", icon: CheckSquare },
];

interface FieldToolbarProps {
  placingType: FieldType | null;
  allowedTypes?: FieldType[];
  disabled?: boolean;
  canUndo?: boolean;
  onSelectType: (type: FieldType | null) => void;
  onUndo?: () => void;
}

export function FieldToolbar({
  placingType,
  allowedTypes,
  disabled = false,
  canUndo = false,
  onSelectType,
  onUndo,
}: FieldToolbarProps) {
  const tools = allowedTypes
    ? FIELD_TOOLS.filter((tool) => allowedTypes.includes(tool.type))
    : FIELD_TOOLS;

  return (
    <div
      id="tour-editor-toolbar"
      className="field-toolbar-glass fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-fit max-w-[calc(100vw-2rem)] -translate-x-1/2"
      role="toolbar"
      aria-label="Herramientas de campo"
    >
      <div className="field-toolbar-glass__border" aria-hidden />
      <div className="field-toolbar-glass__inner gap-2 px-3 py-2.5 sm:gap-2.5 sm:px-3.5">
        {tools.map((tool) => {
          const isActive = placingType === tool.type;
          const Icon = tool.icon;
          const label = FIELD_TYPE_LABELS[tool.type];

          return (
            <button
              key={tool.type}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              aria-label={label}
              onClick={() => onSelectType(isActive ? null : tool.type)}
              className={cn(
                "flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1.5 transition-colors duration-150 sm:min-w-[54px] sm:px-3.5 sm:py-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-white/70",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
              <span className="hidden text-[10px] font-medium leading-none sm:inline">
                {label}
              </span>
            </button>
          );
        })}

        {onUndo ? (
          <>
            <div
              className="mx-1 h-8 w-px shrink-0 bg-foreground/15 sm:mx-1.5"
              aria-hidden
            />
            <button
              type="button"
              disabled={disabled || !canUndo}
              aria-label="Quitar el último campo colocado"
              title="Quitar el último campo colocado"
              onClick={onUndo}
              className={cn(
                "flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1.5 text-foreground transition-colors duration-150 hover:bg-white/70 sm:min-w-[58px] sm:px-3.5 sm:py-2",
                (disabled || !canUndo) && "pointer-events-none opacity-40",
              )}
            >
              <Trash2 className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
              <span className="hidden max-w-[4.5rem] text-center text-[10px] font-medium leading-tight sm:inline">
                Quitar último
              </span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
