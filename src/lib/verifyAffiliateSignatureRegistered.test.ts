import { afterEach, describe, expect, it, vi } from "vitest";

describe("verifyAffiliateSignatureRegistered", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns registered when metadata says the affiliate already signed", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "/api");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            signing_estado: "firmado_afiliado",
            can_sign: false,
            firmado_afiliado_at: "2026-09-03T12:00:00-05:00",
          },
        }),
      }),
    );

    const { verifyAffiliateSignatureRegistered } = await import(
      "./verifyAffiliateSignatureRegistered"
    );
    await expect(verifyAffiliateSignatureRegistered("abcToken")).resolves.toEqual({
      registered: true,
      firmadoAfiliadoAt: "2026-09-03T12:00:00-05:00",
    });
  });

  it("returns not registered when the convenio is still pending", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "/api");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            signing_estado: "pendiente_firma",
            can_sign: true,
          },
        }),
      }),
    );

    const { verifyAffiliateSignatureRegistered } = await import(
      "./verifyAffiliateSignatureRegistered"
    );
    await expect(verifyAffiliateSignatureRegistered("abcToken")).resolves.toEqual({
      registered: false,
      firmadoAfiliadoAt: null,
    });
  });

  it("returns not registered when the metadata request fails", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "/api");
    vi.resetModules();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { verifyAffiliateSignatureRegistered } = await import(
      "./verifyAffiliateSignatureRegistered"
    );
    await expect(verifyAffiliateSignatureRegistered("abcToken")).resolves.toEqual({
      registered: false,
      firmadoAfiliadoAt: null,
    });
  });
});
