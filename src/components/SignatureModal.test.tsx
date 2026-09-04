import { forwardRef, useImperativeHandle } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignatureModal } from "@/components/SignatureModal";

const SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

const mobileFlags = { isMobile: false, isLandscapeMobile: false };

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mobileFlags.isMobile,
  useIsLandscapeMobile: () => mobileFlags.isLandscapeMobile,
}));

vi.mock("react-signature-canvas", () => {
  const MockCanvas = forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => ({
      clear: vi.fn(),
      isEmpty: () => true,
      toDataURL: () => SIGNATURE_PNG,
      getCanvas: () => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 50;
        return canvas;
      },
    }));
    return <canvas data-testid="signature-pad" />;
  });
  MockCanvas.displayName = "MockSignatureCanvas";
  return { default: MockCanvas };
});

function renderModal(
  extras: {
    currentSignature?: string | null;
    onClose?: () => void;
    onSignatureCreate?: (signature: string) => void;
    onClearSignature?: () => void;
  } = {},
) {
  const onClose = extras.onClose ?? vi.fn();
  const onSignatureCreate = extras.onSignatureCreate ?? vi.fn();
  const onClearSignature = extras.onClearSignature ?? vi.fn();

  render(
    <SignatureModal
      isOpen
      onClose={onClose}
      onSignatureCreate={onSignatureCreate}
      onClearSignature={onClearSignature}
      currentSignature={extras.currentSignature}
    />,
  );

  return { onClose, onSignatureCreate, onClearSignature };
}

describe("SignatureModal", () => {
  beforeEach(() => {
    mobileFlags.isMobile = false;
    mobileFlags.isLandscapeMobile = false;
  });

  describe("desktop", () => {
    it("shows the same canvas box, tabs and actions when creating a signature", () => {
      renderModal();

      expect(document.getElementById("tour-signature-canvas")).toBeInTheDocument();
      expect(screen.getByTestId("signature-pad")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Dibujar/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Subir imagen/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Limpiar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Usar firma/i })).toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /Vista previa/i })).not.toBeInTheDocument();
    });

    it("keeps the same canvas box and tabs when editing an existing signature", () => {
      renderModal({ currentSignature: SIGNATURE_PNG });

      expect(document.getElementById("tour-signature-canvas")).toBeInTheDocument();
      expect(screen.getByAltText("Tu firma actual")).toBeInTheDocument();
      expect(screen.queryByTestId("signature-pad")).not.toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Dibujar/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Subir imagen/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Mantener/i })).toBeInTheDocument();
    });

    it("starts an in-place redraw without closing the modal", () => {
      const { onClose, onClearSignature } = renderModal({ currentSignature: SIGNATURE_PNG });

      fireEvent.click(screen.getByRole("button", { name: /Limpiar/i }));

      expect(onClose).not.toHaveBeenCalled();
      expect(onClearSignature).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: /Tu firma/i })).toBeInTheDocument();
      expect(document.getElementById("tour-signature-canvas")).toBeInTheDocument();
      expect(screen.queryByAltText("Tu firma actual")).not.toBeInTheDocument();
      expect(screen.getByTestId("signature-pad")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Usar firma/i })).toBeInTheDocument();
    });

    it("keeps the current signature when the user confirms Mantener", () => {
      const { onClose, onSignatureCreate } = renderModal({ currentSignature: SIGNATURE_PNG });

      fireEvent.click(screen.getByRole("button", { name: /Mantener/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSignatureCreate).not.toHaveBeenCalled();
    });
  });

  describe("portrait mobile", () => {
    beforeEach(() => {
      mobileFlags.isMobile = true;
    });

    it("shows the same canvas box and two-action bar when creating", () => {
      renderModal();

      expect(document.getElementById("tour-signature-canvas")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Dibujar/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Subir/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Limpiar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Usar firma/i })).toBeInTheDocument();
    });

    it("shows the existing signature in the same canvas box when editing", () => {
      renderModal({ currentSignature: SIGNATURE_PNG });

      expect(document.getElementById("tour-signature-canvas")).toBeInTheDocument();
      expect(screen.getByAltText("Tu firma actual")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Dibujar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Mantener/i })).toBeInTheDocument();
    });

    it("redraws in place after Limpiar without unmounting the dialog", () => {
      const { onClose } = renderModal({ currentSignature: SIGNATURE_PNG });

      fireEvent.click(screen.getByRole("button", { name: /Limpiar/i }));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Tu firma")).toBeInTheDocument();
      expect(document.getElementById("tour-signature-canvas")).toBeInTheDocument();
      expect(screen.getByTestId("signature-pad")).toBeInTheDocument();
    });
  });
});
