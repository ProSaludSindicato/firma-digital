import { describe, expect, it, vi } from "vitest";

const loadMock = vi.fn().mockResolvedValue({ getPages: () => [] });

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    load: loadMock,
  },
}));

describe("loadPdfDocument", () => {
  it("loads PDFs with ignoreEncryption for protected documents", async () => {
    loadMock.mockClear();
    const { loadPdfDocument } = await import("@/lib/loadPdfDocument");
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    await loadPdfDocument(buffer);

    expect(loadMock).toHaveBeenCalledWith(buffer, { ignoreEncryption: true });
  });
});
