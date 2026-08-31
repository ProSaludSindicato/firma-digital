import { describe, expect, it } from "vitest";
import {
  documentEditorReducer,
  initialDocumentEditorState,
} from "@/hooks/useDocumentEditor";
import type { DocumentField } from "@/types/documentEditor";

const sampleField = (overrides: Partial<DocumentField> = {}): DocumentField => ({
  id: "field-1",
  type: "text",
  label: "Nombre",
  required: true,
  page: 1,
  x: 100,
  y: 80,
  width: 180,
  height: 28,
  scale: 1,
  value: null,
  ...overrides,
});

describe("documentEditorReducer", () => {
  it("resets fields when a new file is set", () => {
    const file = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });
    const withField = documentEditorReducer(initialDocumentEditorState, {
      type: "ADD_FIELD",
      field: sampleField(),
    });

    const next = documentEditorReducer(withField, { type: "SET_FILE", file });

    expect(next.file).toBe(file);
    expect(next.fields).toEqual([]);
    expect(next.activeFieldId).toBeNull();
  });

  it("adds a field, selects it, and keeps the active placement tool", () => {
    const field = sampleField();
    const placing = documentEditorReducer(initialDocumentEditorState, {
      type: "SET_PLACING_TYPE",
      fieldType: "text",
    });
    const next = documentEditorReducer(placing, {
      type: "ADD_FIELD",
      field,
    });

    expect(next.fields).toHaveLength(1);
    expect(next.activeFieldId).toBe(field.id);
    expect(next.placingType).toBe("text");
    expect(next.mode).toBe("placing");
  });

  it("updates, sets value, and removes a field", () => {
    const field = sampleField();
    let state = documentEditorReducer(initialDocumentEditorState, {
      type: "ADD_FIELD",
      field,
    });

    state = documentEditorReducer(state, {
      type: "UPDATE_FIELD",
      id: field.id,
      changes: { label: "Nombre completo" },
    });
    expect(state.fields[0].label).toBe("Nombre completo");

    state = documentEditorReducer(state, {
      type: "SET_VALUE",
      id: field.id,
      value: { type: "text", text: "Ana" },
    });
    expect(state.fields[0].value).toEqual({ type: "text", text: "Ana" });

    state = documentEditorReducer(state, { type: "REMOVE_FIELD", id: field.id });
    expect(state.fields).toHaveLength(0);
    expect(state.activeFieldId).toBeNull();
  });

  it("undoes the last placed field", () => {
    const fieldA = sampleField({ id: "field-a" });
    const fieldB = sampleField({ id: "field-b" });
    let state = documentEditorReducer(initialDocumentEditorState, {
      type: "ADD_FIELD",
      field: fieldA,
    });
    state = documentEditorReducer(state, {
      type: "ADD_FIELD",
      field: fieldB,
    });

    state = documentEditorReducer(state, { type: "UNDO_LAST_FIELD" });

    expect(state.fields).toHaveLength(1);
    expect(state.fields[0].id).toBe("field-a");
  });

  it("keeps the active placement tool when selecting a field", () => {
    const field = sampleField();
    const placing = documentEditorReducer(initialDocumentEditorState, {
      type: "SET_PLACING_TYPE",
      fieldType: "text",
    });
    const withField = documentEditorReducer(placing, {
      type: "ADD_FIELD",
      field,
    });

    const next = documentEditorReducer(withField, {
      type: "SELECT_FIELD",
      id: field.id,
    });

    expect(next.placingType).toBe("text");
    expect(next.activeFieldId).toBe(field.id);
    expect(next.mode).toBe("placing");
  });

  it("enters placing mode when a field type is chosen", () => {
    const next = documentEditorReducer(initialDocumentEditorState, {
      type: "SET_PLACING_TYPE",
      fieldType: "signature",
    });

    expect(next.placingType).toBe("signature");
    expect(next.mode).toBe("placing");
    expect(next.activeFieldId).toBeNull();
  });
});
