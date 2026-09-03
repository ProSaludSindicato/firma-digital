import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldOverlay } from "@/components/editor/FieldOverlay";
import { SignatureField } from "@/components/editor/fields/SignatureField";
import type { DocumentField } from "@/types/documentEditor";

const SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }

  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    value: PointerEventPolyfill,
  });
}

function makeField(overrides: Partial<DocumentField> = {}): DocumentField {
  return {
    id: "sig-1",
    type: "signature",
    label: "Firma",
    required: true,
    page: 1,
    x: 120,
    y: 80,
    width: 106,
    height: 48,
    scale: 1,
    value: { type: "signature", dataUrl: SIGNATURE_PNG },
    ...overrides,
  };
}

function renderSignatureOverlay(
  field: DocumentField,
  extras: { isSelected?: boolean } = {},
) {
  const onRequestEdit = vi.fn();
  const onUpdate = vi.fn();
  const onSelect = vi.fn();

  render(
    <FieldOverlay
      field={field}
      viewerScale={1}
      canvasSize={{ width: 800, height: 600 }}
      isSelected={extras.isSelected ?? true}
      isLocked={false}
      onSelect={onSelect}
      onUpdate={onUpdate}
      onRemove={vi.fn()}
      onRequestEdit={onRequestEdit}
    >
      <SignatureField
        field={field}
        isLocked={false}
        onRequestEdit={onRequestEdit}
      />
    </FieldOverlay>,
  );

  return { onRequestEdit, onUpdate, onSelect };
}

function pointerOn(
  target: Document | Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  clientX: number,
  clientY: number,
) {
  fireEvent(
    target,
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      clientX,
      clientY,
    }),
  );
}

describe("FieldOverlay signature interactions", () => {
  it("does not open the editor after dragging a placed signature", () => {
    const field = makeField();
    const { onRequestEdit, onUpdate } = renderSignatureOverlay(field);
    const overlay = screen.getByRole("group", { name: /Firma/ });

    pointerOn(overlay, "pointerdown", 120, 80);
    pointerOn(document, "pointermove", 160, 100);
    pointerOn(document, "pointerup", 160, 100);
    fireEvent.click(overlay);

    expect(onUpdate).toHaveBeenCalled();
    expect(onRequestEdit).not.toHaveBeenCalled();
  });

  it("opens the editor from the pencil control", () => {
    const { onRequestEdit } = renderSignatureOverlay(makeField());

    fireEvent.click(screen.getByRole("button", { name: "Editar Firma" }));

    expect(onRequestEdit).toHaveBeenCalledTimes(1);
  });

  it("opens the editor when clicking an empty signature", () => {
    const empty = makeField({ value: null });
    const { onRequestEdit } = renderSignatureOverlay(empty);

    fireEvent.click(screen.getByRole("button", { name: "Dibujar Firma" }));

    expect(onRequestEdit).toHaveBeenCalledTimes(1);
  });

  it("does not open the editor after dragging an empty signature", () => {
    const empty = makeField({ value: null });
    const { onRequestEdit, onUpdate } = renderSignatureOverlay(empty);
    const drawButton = screen.getByRole("button", { name: "Dibujar Firma" });

    pointerOn(drawButton, "pointerdown", 120, 80);
    pointerOn(document, "pointermove", 180, 120);
    pointerOn(document, "pointerup", 180, 120);
    fireEvent.click(drawButton);

    expect(onUpdate).toHaveBeenCalled();
    expect(onRequestEdit).not.toHaveBeenCalled();
  });

  it("shows a move handle on a selected signature", () => {
    renderSignatureOverlay(makeField());

    expect(screen.getByLabelText("Mover Firma")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Arrastra para mover/ })).toBeInTheDocument();
  });
});
