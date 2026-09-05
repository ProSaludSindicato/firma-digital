import { describe, expect, it } from "vitest";
import { pdfjsWorkerSrc } from "@/lib/pdfjsSetup";

describe("pdfjsSetup", () => {
  it("resolves the worker to a Vite asset URL, not a path under src/lib", () => {
    expect(pdfjsWorkerSrc).toContain("pdf.worker");
    expect(pdfjsWorkerSrc).not.toContain("/src/lib/pdfjs-dist/");
  });
});
