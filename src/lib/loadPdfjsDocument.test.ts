import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocumentMock = vi.fn();

vi.mock("@/lib/pdfjsSetup", () => ({
  pdfjsLib: {
    getDocument: (params: { data: ArrayBuffer }) => getDocumentMock(params),
    GlobalWorkerOptions: { workerSrc: "worker.js" },
  },
}));

vi.mock("pdfjs-dist/legacy/build/pdf.worker.mjs", () => ({}));

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

  it("retries on the main thread when the worker load fails", async () => {
    const source = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
    const onWorkerFallback = vi.fn();
    getDocumentMock
      .mockImplementationOnce(() => ({
        promise: Promise.reject(new Error("Setting up fake worker failed")),
      }))
      .mockImplementationOnce(() => ({
        promise: Promise.resolve({ numPages: 1, destroy: vi.fn() }),
      }));

    const { loadPdfjsDocumentFromBytes } = await import(
      "@/lib/loadPdfjsDocument"
    );
    const pdf = await loadPdfjsDocumentFromBytes(source, { onWorkerFallback });

    expect(onWorkerFallback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Setting up fake worker failed" }),
    );
    expect(getDocumentMock).toHaveBeenCalledTimes(2);
    expect(pdf.numPages).toBe(1);
  });
});
