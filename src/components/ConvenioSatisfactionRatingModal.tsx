import { useEffect, useRef } from "react";
import { ConvenioSatisfactionRating } from "@/components/ConvenioSatisfactionRating";
import type { SatisfactionScore } from "@/components/ConvenioSatisfactionRating";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type ConvenioSatisfactionRatingModalProps = {
  token: string;
  canRate: boolean;
  initialScore?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRated?: (score: SatisfactionScore) => void;
};

export function ConvenioSatisfactionRatingModal({
  token,
  canRate,
  initialScore = null,
  open,
  onOpenChange,
  onRated,
}: ConvenioSatisfactionRatingModalProps) {
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleRated = (score: SatisfactionScore) => {
    onRated?.(score);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      onOpenChange(false);
    }, 1800);
  };

  if (!canRate && initialScore === null) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-md [&>button]:right-3 [&>button]:top-3 [&>button]:rounded-full [&>button]:border [&>button]:border-border/70 [&>button]:bg-background/95 [&>button]:shadow-sm">
        <DialogTitle className="sr-only">
          Calificación del proceso de firma digital
        </DialogTitle>
        <ConvenioSatisfactionRating
          token={token}
          canRate={canRate}
          initialScore={initialScore}
          onRated={handleRated}
        />
      </DialogContent>
    </Dialog>
  );
}
