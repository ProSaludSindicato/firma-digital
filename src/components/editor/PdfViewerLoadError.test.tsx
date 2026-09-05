import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PdfViewerLoadError } from "@/components/editor/PdfViewerLoadError";

describe("PdfViewerLoadError", () => {
  it("shows the pdf.js error instead of an empty viewer", () => {
    render(
      <PdfViewerLoadError
        message="Setting up fake worker failed: Cannot load script"
        onReload={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/No pudimos mostrar el documento/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Setting up fake worker failed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Recargar documento/i }),
    ).toBeInTheDocument();
  });
});
