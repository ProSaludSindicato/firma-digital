import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicToolsUnavailable from "./PublicToolsUnavailable";

describe("PublicToolsUnavailable", () => {
  it("explains that access requires a personal signing link", () => {
    render(<PublicToolsUnavailable />);

    expect(
      screen.getByRole("heading", { name: /acceso solo con un enlace personal/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/prosalud envía por correo/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /auxiliartalento\.sprosalud@gmail\.com/i })).toHaveAttribute(
      "href",
      "mailto:auxiliartalento.sprosalud@gmail.com",
    );
    expect(screen.queryByText(/sube tu pdf/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /volver al inicio/i })).not.toBeInTheDocument();
  });
});
