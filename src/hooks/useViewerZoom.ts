import { useCallback, useEffect, useState } from "react";
import {
  getResponsiveViewerZoom,
  pdfViewerZoom,
  stepViewerZoom,
} from "@/lib/pdfViewerConfig";

export function useViewerZoom() {
  const [scale, setScale] = useState(getResponsiveViewerZoom);

  useEffect(() => {
    const handleOrientationChange = () => {
      const timer = window.setTimeout(() => {
        setScale(getResponsiveViewerZoom());
      }, 120);
      return timer;
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    return () => window.removeEventListener("orientationchange", handleOrientationChange);
  }, []);

  const zoomIn = useCallback(
    () => setScale((current) => stepViewerZoom(current, 1)),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((current) => stepViewerZoom(current, -1)),
    [],
  );

  return {
    scale,
    setScale,
    zoomIn,
    zoomOut,
    minScale: pdfViewerZoom.min,
    maxScale: pdfViewerZoom.max,
  };
}
