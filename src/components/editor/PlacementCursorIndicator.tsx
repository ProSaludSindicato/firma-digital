import { CalendarDays, CheckSquare, Hash, PenLine, Type } from "lucide-react";
import { FIELD_TYPE_LABELS } from "@/lib/fieldDefaults";
import type { FieldType } from "@/types/documentEditor";

const TOOL_ICONS: Record<FieldType, typeof PenLine> = {
  signature: PenLine,
  text: Type,
  number: Hash,
  date: CalendarDays,
  checkbox: CheckSquare,
};

interface PlacementCursorIndicatorProps {
  placingType: FieldType;
  x: number;
  y: number;
}

export function PlacementCursorIndicator({
  placingType,
  x,
  y,
}: PlacementCursorIndicatorProps) {
  const Icon = TOOL_ICONS[placingType];
  const label = FIELD_TYPE_LABELS[placingType];

  return (
    <div
      className="pointer-events-none fixed z-[100] flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-[12px] font-medium text-white shadow-md"
      style={{
        left: x + 14,
        top: y + 14,
      }}
      aria-hidden
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" />
      <span>{label}</span>
    </div>
  );
}
