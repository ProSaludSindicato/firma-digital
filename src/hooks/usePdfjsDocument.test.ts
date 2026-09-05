import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadPdfjsDocumentFromBytes = vi.fn();
const reportClientError = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
}));

vi.mock("@/lib/loadPdfjsDocument", () => ({
  loadPdfjsDocumentFromBytes: (...args: unknown[]) =>
    loadPdfjsDocumentFromBytes(...args),
}));

vi.mock("@/lib/reportClientError", () => ({
  reportClientError: (...args: unknown[]) => reportClientError(...args),
}));

describe("usePdfjsDocument", () => {
  beforeEach(() => {
    loadPdfjsDocumentFromBytes.mockReset();
    reportClientError.mockReset();
  });

  it("keeps the source File readable after loading a sliced copy", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 4, 5, 6]);
    const file = new File([bytes], "convenio.pdf", { type: "application/pdf" });
    loadPdfjsDocumentFromBytes.mockImplementation(async (data: ArrayBuffer) => {
      expect(data).not.toBe(bytes.buffer);
      return { numPages: 3, destroy: vi.fn() };
    });

    const { usePdfjsDocument } = await import("@/hooks/usePdfjsDocument");
    const { result } = renderHook(() => usePdfjsDocument(file));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalPages).toBe(3);
    expect(result.current.error).toBeNull();
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
  });

  it("reports a pdf_load error when parsing fails", async () => {
    const file = new File(["%PDF"], "convenio.pdf", { type: "application/pdf" });
    loadPdfjsDocumentFromBytes.mockRejectedValue(new Error("Invalid PDF"));

    const { usePdfjsDocument } = await import("@/hooks/usePdfjsDocument");
    const { result } = renderHook(() => usePdfjsDocument(file));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Invalid PDF");
    expect(result.current.totalPages).toBe(0);
    expect(reportClientError).toHaveBeenCalledWith(expect.any(Error), {
      phase: "pdf_load",
    });
  });
});
