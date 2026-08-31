import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FIELD_TYPE_LABELS } from "@/lib/fieldDefaults";
import type { DocumentField } from "@/types/documentEditor";

interface FieldPropertiesPanelProps {
  field: DocumentField | null;
  disabled?: boolean;
  onUpdate: (id: string, changes: Partial<DocumentField>) => void;
  onRemove: (id: string) => void;
}

export function FieldPropertiesPanel({
  field,
  disabled = false,
  onUpdate,
  onRemove,
}: FieldPropertiesPanelProps) {
  if (!field) {
    return (
      <aside className="hidden w-56 shrink-0 flex-col border-l border-border/60 bg-card/60 p-4 lg:flex">
        <p className="text-xs font-medium text-muted-foreground">
          Propiedades del campo
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Selecciona un campo en el documento para editar su etiqueta y si es
          obligatorio.
        </p>
      </aside>
    );
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-4 border-l border-border/60 bg-card/60 p-4 lg:flex">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {FIELD_TYPE_LABELS[field.type]}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          Página {field.page}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="field-label">Etiqueta</Label>
        <Input
          id="field-label"
          value={field.label}
          disabled={disabled}
          onChange={(event) => onUpdate(field.id, { label: event.target.value })}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="field-required">Obligatorio</Label>
        <Switch
          id="field-required"
          checked={field.required}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onUpdate(field.id, { required: checked })
          }
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {Math.round(field.width)} × {Math.round(field.height)} px
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="mt-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onRemove(field.id)}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Eliminar campo
      </Button>
    </aside>
  );
}
