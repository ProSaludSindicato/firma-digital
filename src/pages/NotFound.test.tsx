import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("NotFound", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("links home when public tools are enabled", async () => {
    vi.stubEnv("VITE_PUBLIC_TOOLS_ENABLED", "true");
    vi.resetModules();
    const { default: NotFound } = await import("./NotFound");

    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /volver al inicio/i })).toHaveAttribute("href", "/");
  });

  it("does not invite users to the public app when tools are disabled", async () => {
    vi.stubEnv("VITE_PUBLIC_TOOLS_ENABLED", "false");
    vi.stubEnv("VITE_PROSALUD_PORTAL_URL", "");
    vi.resetModules();
    const { default: NotFound } = await import("./NotFound");

    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /volver al inicio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
  });

  it("points to the ProSalud portal when public tools are off", async () => {
    vi.stubEnv("VITE_PUBLIC_TOOLS_ENABLED", "false");
    vi.stubEnv("VITE_PROSALUD_PORTAL_URL", "https://www.prosalud.org.co/");
    vi.resetModules();
    const { default: NotFound } = await import("./NotFound");

    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /ir al portal de prosalud/i })).toHaveAttribute(
      "href",
      "https://www.prosalud.org.co",
    );
  });
});
