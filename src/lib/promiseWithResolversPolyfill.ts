type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PromiseWithResolversStatic = {
  withResolvers: <T>() => PromiseWithResolvers<T>;
};

export function installPromiseWithResolversPolyfill(): void {
  const promiseCtor = Promise as PromiseConstructor & Partial<PromiseWithResolversStatic>;

  if (typeof promiseCtor.withResolvers === "function") {
    return;
  }

  promiseCtor.withResolvers = function withResolvers<T>(): PromiseWithResolvers<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };
}
