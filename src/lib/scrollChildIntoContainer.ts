export type ContainerScrollBlock = "start" | "center" | "end" | "nearest";

/**
 * Desplaza un hijo dentro de su contenedor con overflow, sin usar
 * `scrollIntoView`. En iOS Safari, `scrollIntoView` también mueve el
 * documento y deja el header fuera de pantalla.
 */
export function scrollChildIntoContainer(
  container: HTMLElement,
  child: HTMLElement,
  options?: { behavior?: ScrollBehavior; block?: ContainerScrollBlock },
): void {
  const behavior = options?.behavior ?? "smooth";
  const block = options?.block ?? "start";
  const viewHeight = container.clientHeight;
  if (viewHeight <= 0) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  const current = container.scrollTop;
  const childTop = childRect.top - containerRect.top + current;
  const childHeight = childRect.height;
  const childBottom = childTop + childHeight;
  const viewBottom = current + viewHeight;

  let top = childTop;
  if (block === "end") {
    top = childTop - (viewHeight - childHeight);
  } else if (block === "center") {
    top = childTop - (viewHeight - childHeight) / 2;
  } else if (block === "nearest") {
    if (childTop >= current && childBottom <= viewBottom) {
      return;
    }
    top = childTop < current ? childTop : childTop - (viewHeight - childHeight);
  }

  const maxScroll = Math.max(0, container.scrollHeight - viewHeight);
  container.scrollTo({
    top: Math.max(0, Math.min(top, maxScroll)),
    behavior,
  });
}
