import { convenioFirmaReportErrorUrl } from "@/lib/prosaludConvenioApi";

export type ClientErrorReportContext = {
  user_agent?: string;
  device_memory?: number;
  viewport?: string;
  phase?: string;
};

export type ClientErrorReportPayload = {
  message: string;
  stack?: string;
  component_stack?: string;
  url?: string;
  token?: string;
  context?: ClientErrorReportContext;
};

export function extractSigningTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/\/sign\/([^/?#]+)/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function readDeviceMemory(): number | undefined {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" && Number.isFinite(memory) ? memory : undefined;
}

function buildContext(phase?: string): ClientErrorReportContext {
  const viewport =
    typeof window !== "undefined"
      ? `${window.innerWidth}x${window.innerHeight}`
      : undefined;

  return {
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    device_memory: typeof navigator !== "undefined" ? readDeviceMemory() : undefined,
    viewport,
    phase,
  };
}

export function reportClientError(
  error: Error,
  options?: { componentStack?: string | null; phase?: string },
): void {
  try {
    const endpoint = convenioFirmaReportErrorUrl();
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const token = extractSigningTokenFromPath(pathname);
    const payload: ClientErrorReportPayload = {
      message: error.message || error.toString(),
      stack: error.stack ? error.stack.slice(0, 8000) : undefined,
      component_stack: options?.componentStack
        ? options.componentStack.slice(0, 8000)
        : undefined,
      url: typeof window !== "undefined" ? window.location.href.slice(0, 2000) : undefined,
      token: token ?? undefined,
      context: buildContext(options?.phase),
    };

    void fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Missing API URL or fetch unavailable; never break the signing UI.
  }
}
