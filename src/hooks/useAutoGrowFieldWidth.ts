import { useLayoutEffect, useRef } from "react";
import { resizeFieldToContent } from "@/lib/fieldAutoWidth";
import type { DocumentField } from "@/types/documentEditor";

export function useAutoGrowFieldWidth(
  field: DocumentField,
  draft: string,
  placeholder: string,
  scaleRatio: number,
  isMobile: boolean,
  onResizeWidth: (width: number) => void,
) {
  const measureRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) {
      return;
    }

    resizeFieldToContent(
      element,
      field,
      draft,
      placeholder,
      scaleRatio,
      isMobile,
      onResizeWidth,
    );
  }, [
    draft,
    field,
    isMobile,
    onResizeWidth,
    placeholder,
    scaleRatio,
  ]);

  return measureRef;
}
