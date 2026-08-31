export type FieldType = "signature" | "text" | "number" | "date" | "checkbox";

export type SignatureFieldValue = {
  type: "signature";
  dataUrl: string;
};

export type TextFieldValue = {
  type: "text";
  text: string;
};

export type NumberFieldValue = {
  type: "number";
  value: string;
};

export type DateFieldValue = {
  type: "date";
  isoDate: string;
  displayFormat: string;
};

export type CheckboxFieldValue = {
  type: "checkbox";
  checked: boolean;
};

export type FieldValue =
  | SignatureFieldValue
  | TextFieldValue
  | NumberFieldValue
  | DateFieldValue
  | CheckboxFieldValue;

export interface DocumentField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  page: number;
  /** Center X in canvas pixels at `scale`. */
  x: number;
  /** Center Y in canvas pixels at `scale`. */
  y: number;
  width: number;
  height: number;
  /** Viewer zoom when the field was placed. Used to convert to PDF points. */
  scale: number;
  value: FieldValue | null;
}

export type EditorMode = "placing" | "editing" | "preview";

export interface DocumentEditorState {
  file: File | null;
  fields: DocumentField[];
  activeFieldId: string | null;
  placingType: FieldType | null;
  mode: EditorMode;
}

export type EditorAction =
  | { type: "SET_FILE"; file: File | null }
  | { type: "ADD_FIELD"; field: DocumentField }
  | { type: "UPDATE_FIELD"; id: string; changes: Partial<DocumentField> }
  | { type: "REMOVE_FIELD"; id: string }
  | { type: "UNDO_LAST_FIELD" }
  | { type: "SET_VALUE"; id: string; value: FieldValue | null }
  | { type: "SELECT_FIELD"; id: string | null }
  | { type: "SET_PLACING_TYPE"; fieldType: FieldType | null }
  | { type: "SET_MODE"; mode: EditorMode }
  | { type: "LOAD_FIELDS"; fields: DocumentField[] }
  | { type: "RESET" };

/**
 * Field payload as sent by an external system.
 * Coordinates are PDF points with origin at the top-left of the page.
 */
export interface ApiDocumentField {
  id?: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlaceFieldParams {
  type: FieldType;
  page: number;
  x: number;
  y: number;
  scale: number;
  label?: string;
  required?: boolean;
  id?: string;
}

export interface EditorConstraints {
  allowedTypes?: FieldType[];
  allowedPages?: number[];
  maxFields?: number;
  showToolbar?: boolean;
  showPropertiesPanel?: boolean;
  /** User can fill values but not add, move, resize, or delete fields. */
  lockedPlacement?: boolean;
}
