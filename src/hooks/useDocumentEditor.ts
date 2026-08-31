import { useCallback, useMemo, useReducer } from "react";
import { createDocumentField } from "@/lib/fieldDefaults";
import {
  canExportDocument,
  getIncompleteRequiredFields,
} from "@/lib/fieldValidation";
import type {
  DocumentEditorState,
  DocumentField,
  EditorAction,
  EditorMode,
  FieldType,
  FieldValue,
  PlaceFieldParams,
} from "@/types/documentEditor";

export const initialDocumentEditorState: DocumentEditorState = {
  file: null,
  fields: [],
  activeFieldId: null,
  placingType: null,
  mode: "editing",
};

export function documentEditorReducer(
  state: DocumentEditorState,
  action: EditorAction,
): DocumentEditorState {
  switch (action.type) {
    case "SET_FILE":
      return {
        ...initialDocumentEditorState,
        file: action.file,
      };
    case "ADD_FIELD":
      return {
        ...state,
        fields: [...state.fields, action.field],
        activeFieldId: action.field.id,
        placingType: state.placingType,
        mode: state.placingType ? "placing" : "editing",
      };
    case "UNDO_LAST_FIELD": {
      if (state.fields.length === 0) {
        return state;
      }
      const lastField = state.fields[state.fields.length - 1];
      return {
        ...state,
        fields: state.fields.slice(0, -1),
        activeFieldId:
          state.activeFieldId === lastField.id ? null : state.activeFieldId,
      };
    }
    case "UPDATE_FIELD":
      return {
        ...state,
        fields: state.fields.map((field) =>
          field.id === action.id ? { ...field, ...action.changes } : field,
        ),
      };
    case "REMOVE_FIELD":
      return {
        ...state,
        fields: state.fields.filter((field) => field.id !== action.id),
        activeFieldId:
          state.activeFieldId === action.id ? null : state.activeFieldId,
      };
    case "SET_VALUE":
      return {
        ...state,
        fields: state.fields.map((field) =>
          field.id === action.id ? { ...field, value: action.value } : field,
        ),
      };
    case "SELECT_FIELD":
      return {
        ...state,
        activeFieldId: action.id,
        placingType: state.placingType,
        mode: state.placingType ? "placing" : action.id ? "editing" : state.mode,
      };
    case "SET_PLACING_TYPE":
      return {
        ...state,
        placingType: action.fieldType,
        activeFieldId: action.fieldType ? null : state.activeFieldId,
        mode: action.fieldType ? "placing" : "editing",
      };
    case "SET_MODE":
      return {
        ...state,
        mode: action.mode,
        placingType: action.mode === "placing" ? state.placingType : null,
      };
    case "LOAD_FIELDS":
      return {
        ...state,
        fields: action.fields,
        activeFieldId: null,
        placingType: null,
        mode: "editing",
      };
    case "RESET":
      return initialDocumentEditorState;
    default:
      return state;
  }
}

export function useDocumentEditor(isMobile = false) {
  const [state, dispatch] = useReducer(
    documentEditorReducer,
    initialDocumentEditorState,
  );

  const setFile = useCallback((file: File | null) => {
    dispatch({ type: "SET_FILE", file });
  }, []);

  const addFieldAt = useCallback(
    (params: PlaceFieldParams): DocumentField => {
      const field = createDocumentField(params, isMobile);
      dispatch({ type: "ADD_FIELD", field });
      return field;
    },
    [isMobile],
  );

  const updateField = useCallback(
    (id: string, changes: Partial<DocumentField>) => {
      dispatch({ type: "UPDATE_FIELD", id, changes });
    },
    [],
  );

  const removeField = useCallback((id: string) => {
    dispatch({ type: "REMOVE_FIELD", id });
  }, []);

  const undoLastField = useCallback(() => {
    dispatch({ type: "UNDO_LAST_FIELD" });
  }, []);

  const setValue = useCallback((id: string, value: FieldValue | null) => {
    dispatch({ type: "SET_VALUE", id, value });
  }, []);

  const selectField = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_FIELD", id });
  }, []);

  const setPlacingType = useCallback((fieldType: FieldType | null) => {
    dispatch({ type: "SET_PLACING_TYPE", fieldType });
  }, []);

  const setMode = useCallback((mode: EditorMode) => {
    dispatch({ type: "SET_MODE", mode });
  }, []);

  const loadFields = useCallback((fields: DocumentField[]) => {
    dispatch({ type: "LOAD_FIELDS", fields });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const activeField = useMemo(
    () => state.fields.find((field) => field.id === state.activeFieldId) ?? null,
    [state.fields, state.activeFieldId],
  );

  const incompleteRequiredFields = useMemo(
    () => getIncompleteRequiredFields(state.fields),
    [state.fields],
  );

  const canExport = useMemo(
    () => canExportDocument(state.fields),
    [state.fields],
  );

  return {
    ...state,
    activeField,
    incompleteRequiredFields,
    canExport,
    setFile,
    addFieldAt,
    updateField,
    removeField,
    undoLastField,
    setValue,
    selectField,
    setPlacingType,
    setMode,
    loadFields,
    reset,
  };
}
