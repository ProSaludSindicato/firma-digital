import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocumentMock = vi.fn();

vi.mock("@/lib/pdfjsSetup", () => ({
  pdfjsLib: {
    getDocument: (params: { data: ArrayBuffer }) => getDocumentMock(params),
    GlobalWorkerOptions: { workerSrc: "worker.js" },
  },
}));

describe("loadPdfjsDocumentFromBytes", () => {
  beforeEach(() => {
    getDocumentMock.mockReset();
  });

  it("passes a sliced copy to getDocument so the source buffer stays intact", async () => {
    const source = new Uint8Array([0x25, 0x50, 0x44, 0x46, 9, 8, 7]).buffer;
    let received: ArrayBuffer | undefined;
    getDocumentMock.mockImplementation(({ data }: { data: ArrayBuffer }) => {
      received = data;
      return {
        promise: Promise.resolve({ numPages: 2, destroy: vi.fn() }),
      };
    });

    const { loadPdfjsDocumentFromBytes } = await import(
      "@/lib/loadPdfjsDocument"
    );
    const pdf = await loadPdfjsDocumentFromBytes(source);

    expect(received).toBeDefined();
    expect(received).not.toBe(source);
    expect(new Uint8Array(received!)).toEqual(new Uint8Array(source));
    expect(pdf.numPages).toBe(2);
  });

  it("disables streaming and range requests for in-memory PDF bytes", async () => {
    const source = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
    getDocumentMock.mockImplementation((params: Record<string, unknown>) => {
      expect(params).toMatchObject({
        disableAutoFetch: true,
        disableStream: true,
        disableRange: true,
      });
      return {
        promise: Promise.resolve({ numPages: 1, destroy: vi.fn() }),
      };
    });

    const { loadPdfjsDocumentFromBytes } = await import(
      "@/lib/loadPdfjsDocument"
    );
    const pdf = await loadPdfjsDocumentFromBytes(source);

    expect(pdf.numPages).toBe(1);
  });
});
