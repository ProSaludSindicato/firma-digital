import { describe, expect, it } from "vitest";

describe("pdfjsSetup", () => {
  it("registers WorkerMessageHandler for main-thread PDF parsing without fetching worker assets", async () => {
    const { pdfjsLib } = await import("@/lib/pdfjsSetup");
    const host = globalThis as typeof globalThis & {
      pdfjsWorker?: { WorkerMessageHandler?: unknown };
    };

    expect(host.pdfjsWorker?.WorkerMessageHandler).toBeDefined();
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe("");
  });
});
