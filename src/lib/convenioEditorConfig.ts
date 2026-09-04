import type { EditorConstraints } from "@/types/documentEditor";

export const CONVENIO_SIGNATURE_PAGE = 2;

export const CONVENIO_EDITOR_CONSTRAINTS: EditorConstraints = {
  allowedTypes: ["signature"],
  allowedPages: [CONVENIO_SIGNATURE_PAGE],
  maxFields: 1,
  showToolbar: false,
  showPropertiesPanel: false,
  allowFieldRemoval: false,
};
