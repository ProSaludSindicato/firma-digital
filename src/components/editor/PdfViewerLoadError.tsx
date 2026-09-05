import { Button } from "@/components/ui/button";

export function PdfViewerLoadError({
  message,
  onReload,
}: {
  message: string;
  onReload: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">
        No pudimos mostrar el documento. Recarga para intentarlo de nuevo.
      </p>
      <p className="max-w-sm text-xs text-muted-foreground/80">{message}</p>
      <Button type="button" onClick={onReload}>
        Recargar documento
      </Button>
    </div>
  );
}
