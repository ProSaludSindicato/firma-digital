import { describe, expect, it } from "vitest";
import {
  copyPdfBytes,
  fileFromPdfBytes,
  isConstrainedSigningDevice,
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

describe("isConstrainedSigningDevice", () => {
  it("only skips extra work on low memory or save-data, not on a normal phone", () => {
    expect(isConstrainedSigningDevice({ deviceMemory: 2 })).toBe(true);
    expect(isConstrainedSigningDevice({ saveData: true })).toBe(true);
    expect(
      isConstrainedSigningDevice({
        viewportWidth: 390,
        hardwareConcurrency: 4,
        deviceMemory: 4,
      }),
    ).toBe(false);
  });

  it("does not constrain a desktop with enough memory", () => {
    expect(
      isConstrainedSigningDevice({
        deviceMemory: 8,
        viewportWidth: 1440,
        hardwareConcurrency: 8,
      }),
    ).toBe(false);
  });
});
