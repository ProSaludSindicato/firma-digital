import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Returns true when the device is a phone held in landscape orientation.
 * Uses screen height < 500 px as a reliable proxy: tablets and desktops are
 * always taller, while phones in landscape (even wide ones like iPhone 13 at
 * 390 px logical height) fall below this threshold.
 */
export function useIsLandscapeMobile() {
  const [isLandscapeMobile, setIsLandscapeMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight < 500 && window.innerWidth > window.innerHeight;
  });

  React.useEffect(() => {
    const check = () => {
      setIsLandscapeMobile(window.innerHeight < 500 && window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return isLandscapeMobile;
}
