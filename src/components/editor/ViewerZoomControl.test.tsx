import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewerZoomControl } from "@/components/editor/ViewerZoomControl";

describe("ViewerZoomControl", () => {
  it("renders a compact floating pill with percentage and zoom actions", () => {
    render(
      <ViewerZoomControl
        scale={1.2}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "Zoom del documento" })).toBeInTheDocument();
    expect(screen.getByText("120%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acercar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Alejar" })).toBeEnabled();
  });
});
