import { describe, expect, it } from "vitest";
import {
  isPdfjsFakeWorkerError,
  PDFJS_PUBLIC_WORKER_PATH,
  resolvePdfjsWorkerSrc,
} from "@/lib/pdfjsWorkerSrc";

describe("resolvePdfjsWorkerSrc", () => {
  it("returns a same-origin .js worker URL so iOS does not import a .mjs module", () => {
    expect(resolvePdfjsWorkerSrc("https://firma-digital.prosalud.org.co")).toBe(
      "https://firma-digital.prosalud.org.co/pdf.worker.js",
    );
    expect(PDFJS_PUBLIC_WORKER_PATH).toBe("/pdf.worker.js");
  });

  it("falls back to the public path when no origin is available", () => {
    expect(resolvePdfjsWorkerSrc("")).toBe("/pdf.worker.js");
  });
});

describe("isPdfjsFakeWorkerError", () => {
  it("detects the iOS module-worker import failure", () => {
    expect(
      isPdfjsFakeWorkerError(
        new Error(
          'Setting up fake worker failed: "Importing a module script failed.".',
        ),
      ),
    ).toBe(true);
  });

  it("ignores unrelated PDF parse errors", () => {
    expect(isPdfjsFakeWorkerError(new Error("Invalid PDF structure."))).toBe(
      false,
    );
  });
});
