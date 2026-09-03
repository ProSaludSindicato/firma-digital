import { afterEach, describe, expect, it, vi } from "vitest";

describe("reportClientError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("extracts the signing token from the path", async () => {
    const { extractSigningTokenFromPath } = await import("./reportClientError");

    expect(extractSigningTokenFromPath("/sign/abcToken")).toBe("abcToken");
    expect(extractSigningTokenFromPath("/sign/a%2Fb")).toBe("a/b");
    expect(extractSigningTokenFromPath("/editor")).toBeNull();
  });

  it("posts the error payload without throwing", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "/api");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      userAgent: "TestAgent/1.0",
      deviceMemory: 4,
    });

    const { reportClientError } = await import("./reportClientError");
    reportClientError(new Error("viewer crashed"), {
      componentStack: "at DocumentEditorViewer",
      phase: "viewer",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/convenio-firma/report-error",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      message: string;
      component_stack: string;
      context: { phase: string; device_memory: number };
    };
    expect(body.message).toBe("viewer crashed");
    expect(body.component_stack).toBe("at DocumentEditorViewer");
    expect(body.context.phase).toBe("viewer");
    expect(body.context.device_memory).toBe(4);
  });

  it("does not throw when the API URL is missing", async () => {
    vi.stubEnv("VITE_PROSALUD_API_URL", "");
    vi.resetModules();

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { reportClientError } = await import("./reportClientError");
    expect(() => reportClientError(new Error("boom"))).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
