import { describe, expect, it } from "vitest";
import {
  copyPdfBytes,
  fileFromPdfBytes,
  isPdfMagicBytes,
} from "@/lib/convenioPdfLoad";

describe("isPdfMagicBytes", () => {
  it("accepts a buffer that starts with %PDF", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(isPdfMagicBytes(bytes)).toBe(true);
    expect(isPdfMagicBytes(bytes.buffer)).toBe(true);
  });

  it("rejects empty or non-PDF payloads", () => {
    expect(isPdfMagicBytes(new Uint8Array())).toBe(false);
    expect(isPdfMagicBytes(new TextEncoder().encode("<!DOCTYPE html>"))).toBe(
      false,
    );
  });
});

describe("fileFromPdfBytes", () => {
  it("creates an independent File copy so the source buffer can be reused", async () => {
    const source = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]).buffer;
    const file = fileFromPdfBytes(source, "convenio.pdf");
    const copied = copyPdfBytes(source);

    expect(copied).not.toBe(source);
    expect(new Uint8Array(copied)).toEqual(new Uint8Array(source));
    expect(file.type).toBe("application/pdf");
    expect(file.name).toBe("convenio.pdf");

    new Uint8Array(source)[4] = 99;
    const fromFile = new Uint8Array(await file.arrayBuffer());
    expect(fromFile[4]).toBe(1);
  });
});
