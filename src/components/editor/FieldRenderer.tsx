import { CheckboxField } from "@/components/editor/fields/CheckboxField";
import { DateField } from "@/components/editor/fields/DateField";
import { NumberField } from "@/components/editor/fields/NumberField";
import { SignatureField } from "@/components/editor/fields/SignatureField";
import { TextField } from "@/components/editor/fields/TextField";
import type {
  CheckboxFieldValue,
  DateFieldValue,
  DocumentField,
  FieldValue,
  NumberFieldValue,
  TextFieldValue,
} from "@/types/documentEditor";

interface FieldRendererProps {
  field: DocumentField;
  isSelected: boolean;
  isLocked: boolean;
  scaleRatio: number;
  isMobile?: boolean;
  onChangeValue: (value: FieldValue | null) => void;
  onFieldUpdate: (changes: Partial<DocumentField>) => void;
  onRequestSignatureEdit: () => void;
}

export function FieldRenderer({
  field,
  isSelected,
  isLocked,
  scaleRatio,
  isMobile = false,
  onChangeValue,
  onFieldUpdate,
  onRequestSignatureEdit,
}: FieldRendererProps) {
  const handleResizeWidth = (width: number) => {
    onFieldUpdate({ width });
  };

  switch (field.type) {
    case "signature":
      return (
        <SignatureField
          field={field}
          isLocked={isLocked}
          onRequestEdit={onRequestSignatureEdit}
        />
      );
    case "text":
      return (
        <TextField
          field={field}
          isSelected={isSelected}
          isLocked={isLocked}
          scaleRatio={scaleRatio}
          isMobile={isMobile}
          onChangeValue={(value: TextFieldValue | null) => onChangeValue(value)}
          onResizeWidth={handleResizeWidth}
        />
      );
    case "number":
      return (
        <NumberField
          field={field}
          isSelected={isSelected}
          isLocked={isLocked}
          scaleRatio={scaleRatio}
          isMobile={isMobile}
          onChangeValue={(value: NumberFieldValue | null) => onChangeValue(value)}
          onResizeWidth={handleResizeWidth}
        />
      );
    case "date":
      return (
        <DateField
          field={field}
          isLocked={isLocked}
          onChangeValue={(value: DateFieldValue | null) => onChangeValue(value)}
        />
      );
    case "checkbox":
      return (
        <CheckboxField
          field={field}
          isLocked={isLocked}
          onChangeValue={(value: CheckboxFieldValue) => onChangeValue(value)}
        />
      );
  }
}
