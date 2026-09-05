import { describe, expect, it } from "vitest";
import { installPromiseWithResolversPolyfill } from "@/lib/promiseWithResolversPolyfill";

describe("installPromiseWithResolversPolyfill", () => {
  it("creates a resolvable promise when the runtime lacks withResolvers", async () => {
    const promiseCtor = Promise as PromiseConstructor & {
      withResolvers?: <T>() => {
        promise: Promise<T>;
        resolve: (value: T | PromiseLike<T>) => void;
        reject: (reason?: unknown) => void;
      };
    };
    const original = promiseCtor.withResolvers;
    delete promiseCtor.withResolvers;

    try {
      installPromiseWithResolversPolyfill();

      const { promise, resolve } = promiseCtor.withResolvers!<number>();
      resolve(42);

      await expect(promise).resolves.toBe(42);
    } finally {
      if (original) {
        promiseCtor.withResolvers = original;
      } else {
        delete promiseCtor.withResolvers;
      }
    }
  });

  it("does not overwrite an existing withResolvers implementation", () => {
    const promiseCtor = Promise as PromiseConstructor & {
      withResolvers?: () => unknown;
    };
    const sentinel = () => ({ promise: Promise.resolve(), resolve: () => {}, reject: () => {} });
    promiseCtor.withResolvers = sentinel;

    try {
      installPromiseWithResolversPolyfill();
      expect(promiseCtor.withResolvers).toBe(sentinel);
    } finally {
      delete promiseCtor.withResolvers;
    }
  });
});
