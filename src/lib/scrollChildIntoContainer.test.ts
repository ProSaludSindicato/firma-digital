import { describe, expect, it, vi } from "vitest";
import { scrollChildIntoContainer } from "@/lib/scrollChildIntoContainer";

function fakeElement(rect: {
  top: number;
  height: number;
  clientHeight?: number;
  scrollTop?: number;
  scrollHeight?: number;
}): HTMLElement {
  return {
    clientHeight: rect.clientHeight ?? rect.height,
    scrollTop: rect.scrollTop ?? 0,
    scrollHeight: rect.scrollHeight ?? rect.height,
    getBoundingClientRect: () => ({
      top: rect.top,
      height: rect.height,
      bottom: rect.top + rect.height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: rect.top,
      toJSON: () => ({}),
    }),
    scrollTo: vi.fn(),
  } as unknown as HTMLElement;
}

describe("scrollChildIntoContainer", () => {
  it("aligns the child to the start of the container", () => {
    const container = fakeElement({
      top: 100,
      height: 400,
      clientHeight: 400,
      scrollTop: 80,
      scrollHeight: 1200,
    });
    const child = fakeElement({ top: 260, height: 200 });

    scrollChildIntoContainer(container, child, { behavior: "instant", block: "start" });

    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 240,
      behavior: "instant",
    });
  });

  it("aligns the child to the end of the container", () => {
    const container = fakeElement({
      top: 80,
      height: 500,
      clientHeight: 500,
      scrollTop: 0,
      scrollHeight: 2000,
    });
    const child = fakeElement({ top: 280, height: 700 });

    scrollChildIntoContainer(container, child, { behavior: "auto", block: "end" });

    expect(container.scrollTo).toHaveBeenCalledWith({
      top: 400,
      behavior: "auto",
    });
  });

  it("does not move when the child is already fully visible with nearest", () => {
    const container = fakeElement({
      top: 0,
      height: 500,
      clientHeight: 500,
      scrollTop: 100,
      scrollHeight: 1200,
    });
    const child = fakeElement({ top: 80, height: 200 });

    scrollChildIntoContainer(container, child, { block: "nearest" });

    expect(container.scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing when the container has no visible height yet", () => {
    const container = fakeElement({
      top: 0,
      height: 0,
      clientHeight: 0,
      scrollHeight: 800,
    });
    const child = fakeElement({ top: 40, height: 200 });

    scrollChildIntoContainer(container, child);

    expect(container.scrollTo).not.toHaveBeenCalled();
  });
});
