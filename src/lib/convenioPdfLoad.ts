const PDF_MAGIC = "%PDF";
const LOW_MEMORY_GB = 2;

export type SigningDeviceHints = {
  deviceMemory?: number;
  saveData?: boolean;
  hardwareConcurrency?: number;
  viewportWidth?: number;
};

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

export function readSigningDeviceHints(): SigningDeviceHints {
  if (typeof navigator === "undefined") {
    return {};
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  return {
    deviceMemory:
      typeof nav.deviceMemory === "number" && Number.isFinite(nav.deviceMemory)
        ? nav.deviceMemory
        : undefined,
    saveData: nav.connection?.saveData === true,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === "number"
        ? navigator.hardwareConcurrency
        : undefined,
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : undefined,
  };
}

export function isConstrainedSigningDevice(
  hints: SigningDeviceHints = readSigningDeviceHints(),
): boolean {
  if (
    typeof hints.deviceMemory === "number" &&
    hints.deviceMemory <= LOW_MEMORY_GB
  ) {
    return true;
  }

  return hints.saveData === true;
}
