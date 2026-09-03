import { afterEach, describe, expect, it, vi } from "vitest";

describe("prosaludConvenioApi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("builds same-origin convenio URLs when the API base is relative", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "/api");
    vi.resetModules();
    const {
      convenioFirmaMetadataUrl,
      convenioFirmaDocumentUrl,
      convenioFirmaSubmitUrl,
      convenioFirmaSatisfactionUrl,
    } = await import("./prosaludConvenioApi");

    expect(convenioFirmaMetadataUrl("abcToken")).toBe(
      "/api/public/convenio-firma/abcToken/metadata",
    );
    expect(convenioFirmaDocumentUrl("abcToken")).toBe(
      "/api/public/convenio-firma/abcToken/document.pdf",
    );
    expect(convenioFirmaSubmitUrl("abcToken")).toBe(
      "/api/public/convenio-firma/abcToken/submit-affiliate-signature",
    );
    expect(convenioFirmaSatisfactionUrl("abcToken")).toBe(
      "/api/public/convenio-firma/abcToken/satisfaction-rating",
    );
  });

  it("encodes tokens in convenio URLs", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "/api");
    vi.resetModules();
    const { convenioFirmaMetadataUrl } = await import("./prosaludConvenioApi");

    expect(convenioFirmaMetadataUrl("a/b")).toBe(
      "/api/public/convenio-firma/a%2Fb/metadata",
    );
  });
});
