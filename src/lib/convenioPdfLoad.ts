const PDF_MAGIC = "%PDF";

export function isPdfMagicBytes(data: ArrayBuffer | Uint8Array): boolean {
  if (data.byteLength < PDF_MAGIC.length) {
    return false;
  }

  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export function copyPdfBytes(data: ArrayBuffer): ArrayBuffer {
  return data.slice(0);
}

export function fileFromPdfBytes(
  data: ArrayBuffer,
  filename = "convenio.pdf",
): File {
  return new File([copyPdfBytes(data)], filename, {
    type: "application/pdf",
  });
}
