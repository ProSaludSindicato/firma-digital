import { useState, useCallback, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PDFDocument } from "pdf-lib";
import { validatePDFFile, validatePDFIntegrity, validateImageFile } from "@/lib/validation";
import { validateAndCompressImage } from "@/lib/imageCompression";
import { toast } from "@/hooks/use-toast";
import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";
import { DEFAULT_AUTO_SIGN_CONFIG, AUTO_SIGN_IMAGE_OPTIONS, AI_SEARCH_CONFIG } from "@/lib/autoSignConfig";
import { createSignatureLocationProvider, calculateSignaturePosition } from "@/lib/signatureLocationService";

// ─── Types ────────────────────────────────────────────────────

type DetectionStatus = "idle" | "detecting" | "found" | "fallback" | "error";

interface PDFFileEntry {
  file: File;
  detectionStatus: DetectionStatus;
  config?: AutoSignatureConfig;
}

// ─── Props ────────────────────────────────────────────────────

interface AutoSignatureUploaderProps {
  /** Modo individual: un solo PDF */
  onPDFSelect: (file: File | null) => void;
  /** Modo batch: lista de PDFs */
  onPDFsSelect?: (files: File[]) => void;
  onSignatureImageSelect: (imageDataUrl: string) => void;
  onConfigChange: (config: AutoSignatureConfig) => void;
  pdfFile: File | null;
  signatureImage: string | null;
  signatureConfig: AutoSignatureConfig | null;
  onTotalPagesChange: (pages: number) => void;
  /** Si true, muestra la zona de carga múltiple */
  batchMode?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────

function DetectionBadge({ status }: { status: DetectionStatus }) {
  if (status === "idle") return null;

  const map: Record<Exclude<DetectionStatus, "idle">, { icon: React.ReactNode; text: string; cls: string }> = {
    detecting: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      text: "Detectando posición…",
      cls: "text-muted-foreground",
    },
    found: {
      icon: <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />,
      text: "Posición detectada",
      cls: "text-green-700 dark:text-green-400",
    },
    fallback: {
      icon: <Sparkles className="w-3 h-3 text-amber-500" />,
      text: "Usando posición por defecto",
      cls: "text-amber-600 dark:text-amber-400",
    },
    error: {
      icon: <AlertCircle className="w-3 h-3 text-amber-500" />,
      text: "Error — posición por defecto",
      cls: "text-amber-600 dark:text-amber-400",
    },
  };

  const cfg = map[status];
  return (
    <span className={`flex items-center gap-1 text-[11px] ${cfg.cls}`}>
      {cfg.icon}
      {cfg.text}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────

export const AutoSignatureUploader = ({
  onPDFSelect,
  onPDFsSelect,
  onSignatureImageSelect,
  onConfigChange,
  pdfFile,
  signatureImage,
  signatureConfig,
  onTotalPagesChange,
  batchMode = false,
}: AutoSignatureUploaderProps) => {
  // ── Individual mode state ──────────────────────────────────
  const [isValidatingPDF, setIsValidatingPDF] = useState(false);
  const [singleDetectionStatus, setSingleDetectionStatus] = useState<DetectionStatus>("idle");

  // ── Batch mode state ───────────────────────────────────────
  const [batchEntries, setBatchEntries] = useState<PDFFileEntry[]>([]);
  const [isValidatingBatch, setIsValidatingBatch] = useState(false);

  // ── Shared ─────────────────────────────────────────────────
  const [isValidatingImage, setIsValidatingImage] = useState(false);

  // Keep a ref to detect provider so we can cancel on unmount
  const detectCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // ── Individual: detect position when pdfFile changes ──────
  useEffect(() => {
    if (!pdfFile) {
      setSingleDetectionStatus("idle");
      return;
    }

    const cancel = { cancelled: false };
    detectCancelRef.current = cancel;

    const detect = async () => {
      setSingleDetectionStatus("detecting");
      try {
        const provider = createSignatureLocationProvider();
        const textLocation = await provider.findTextInPDF({
          pdfFile,
          searchText: AI_SEARCH_CONFIG.searchText,
          pageNumber: AI_SEARCH_CONFIG.defaultSearchPage,
        });
        if (cancel.cancelled) return;

        if (textLocation) {
          const pos = calculateSignaturePosition(textLocation, AI_SEARCH_CONFIG.offsetX, AI_SEARCH_CONFIG.offsetY);
          onConfigChange({ page: pos.page, x: pos.x, y: pos.y, width: DEFAULT_AUTO_SIGN_CONFIG.width, height: DEFAULT_AUTO_SIGN_CONFIG.height });
          setSingleDetectionStatus("found");
        } else {
          setSingleDetectionStatus("error");
          toast({
            title: "No se pudo detectar la posición de firma",
            description: "Este documento no cumple el formato esperado para firma automática.",
            variant: "destructive",
          });
        }
      } catch {
        if (cancel.cancelled) return;
        setSingleDetectionStatus("error");
        toast({
          title: "Error en detección automática",
          description: "No se pudo ubicar la línea de firma en este documento.",
          variant: "destructive",
        });
      }
    };

    detect();
    return () => { cancel.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile]);

  // Individual: report page count
  useEffect(() => {
    if (!pdfFile) { onTotalPagesChange(0); return; }
    (async () => {
      try {
        const ab = await pdfFile.arrayBuffer();
        const doc = await PDFDocument.load(ab);
        onTotalPagesChange(doc.getPages().length);
      } catch { /* non-critical */ }
    })();
  }, [pdfFile, onTotalPagesChange]);

  // ── Batch: detect position for each entry when added ──────
  const detectForEntry = useCallback(async (index: number, file: File) => {
    setBatchEntries((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], detectionStatus: "detecting" };
      return next;
    });

    try {
      const provider = createSignatureLocationProvider();
      const textLocation = await provider.findTextInPDF({
        pdfFile: file,
        searchText: AI_SEARCH_CONFIG.searchText,
        pageNumber: AI_SEARCH_CONFIG.defaultSearchPage,
      });

      if (!textLocation) {
        throw new Error("No detection result");
      }
      const pos = calculateSignaturePosition(textLocation, AI_SEARCH_CONFIG.offsetX, AI_SEARCH_CONFIG.offsetY);
      const config: AutoSignatureConfig = {
        page: pos.page,
        x: pos.x,
        y: pos.y,
        width: DEFAULT_AUTO_SIGN_CONFIG.width,
        height: DEFAULT_AUTO_SIGN_CONFIG.height,
      };

      setBatchEntries((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], detectionStatus: "found", config };
        return next;
      });
    } catch {
      setBatchEntries((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], detectionStatus: "error" };
        return next;
      });
    }
  }, []);

  // Propagate batch entries to parent whenever the list changes
  useEffect(() => {
    if (!batchMode || !onPDFsSelect) return;
    onPDFsSelect(batchEntries.map((e) => e.file));
  }, [batchEntries, batchMode, onPDFsSelect]);

  // ── PDF validation helpers ─────────────────────────────────

  const validateAndAddFiles = useCallback(async (files: File[]) => {
    if (batchMode) {
      setIsValidatingBatch(true);
      const valid: File[] = [];
      for (const file of files) {
        const v = validatePDFFile(file);
        if (!v.valid) { toast({ title: "Archivo inválido", description: `${file.name}: ${v.error}`, variant: "destructive" }); continue; }
        const integrity = await validatePDFIntegrity(file);
        if (!integrity.valid) { toast({ title: "Archivo inválido", description: `${file.name}: ${integrity.error}`, variant: "destructive" }); continue; }
        valid.push(file);
      }
      setIsValidatingBatch(false);

      if (valid.length === 0) return;

      setBatchEntries((prev) => {
        const existingNames = new Set(prev.map((e) => e.file.name));
        const newEntries: PDFFileEntry[] = valid
          .filter((f) => !existingNames.has(f.name))
          .map((f) => ({ file: f, detectionStatus: "idle" as DetectionStatus }));
        return [...prev, ...newEntries];
      });

      // Trigger detection for each newly added file
      setBatchEntries((prev) => {
        const start = prev.length - valid.filter((f) => {
          return !batchEntries.some((e) => e.file.name === f.name);
        }).length;
        valid.forEach((f, i) => {
          const idx = prev.findIndex((e) => e.file.name === f.name);
          if (idx !== -1) detectForEntry(idx, f);
          else detectForEntry(start + i, f);
        });
        return prev;
      });

      // Simpler: just detect after state settles
      setTimeout(() => {
        setBatchEntries((current) => {
          current.forEach((entry, idx) => {
            if (entry.detectionStatus === "idle") {
              detectForEntry(idx, entry.file);
            }
          });
          return current;
        });
      }, 50);
    } else {
      // Individual mode: take first file only
      const file = files[0];
      if (!file) return;
      setIsValidatingPDF(true);
      try {
        const v = validatePDFFile(file);
        if (!v.valid) { toast({ title: "Error de validación", description: v.error, variant: "destructive" }); return; }
        const integrity = await validatePDFIntegrity(file);
        if (!integrity.valid) { toast({ title: "Error de validación", description: integrity.error, variant: "destructive" }); return; }
        onPDFSelect(file);
      } catch (error) {
        toast({ title: "Error", description: error instanceof Error ? error.message : "Error al validar el PDF", variant: "destructive" });
      } finally {
        setIsValidatingPDF(false);
      }
    }
  }, [batchMode, batchEntries, detectForEntry, onPDFSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (files.length > 0) validateAndAddFiles(files);
  }, [validateAndAddFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) validateAndAddFiles(files);
    e.target.value = "";
  }, [validateAndAddFiles]);

  const removeEntry = useCallback((index: number) => {
    setBatchEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Image upload ───────────────────────────────────────────

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsValidatingImage(true);
    try {
      const v = validateImageFile(file);
      if (!v.valid) { toast({ title: "Error de validación", description: v.error, variant: "destructive" }); return; }
      const isPNG = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
      const compressed = await validateAndCompressImage(file, {
        maxWidth: AUTO_SIGN_IMAGE_OPTIONS.maxWidth,
        maxHeight: AUTO_SIGN_IMAGE_OPTIONS.maxHeight,
        quality: AUTO_SIGN_IMAGE_OPTIONS.quality,
        format: isPNG ? "png" : "jpeg",
      });
      onSignatureImageSelect(compressed);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error al procesar la imagen", variant: "destructive" });
    } finally {
      setIsValidatingImage(false);
      e.target.value = "";
    }
  }, [onSignatureImageSelect]);

  // ── Render ─────────────────────────────────────────────────

  const isLoading = batchMode ? isValidatingBatch : isValidatingPDF;

  const renderPDFZone = () => {
    if (batchMode) {
      return (
        <div className="space-y-3">
          {/* Drop zone (always visible in batch mode) */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-xl bg-card/80 transition-all ${
              isLoading ? "opacity-50 cursor-wait border-muted" : "hover:border-primary/50 cursor-pointer border-border"
            }`}
          >
            <input type="file" accept=".pdf" multiple onChange={handleFileInput} className="hidden" id="auto-pdf-upload-batch" />
            <label htmlFor="auto-pdf-upload-batch" className="flex flex-col items-center cursor-pointer w-full">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                {isLoading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-primary" />}
              </div>
              <p className="text-sm font-semibold mb-0.5">Arrastra PDFs aquí o haz clic</p>
              <p className="text-xs text-muted-foreground">Puedes cargar varios a la vez (máx. 20&nbsp;MB c/u)</p>
            </label>
          </div>

          {/* File list */}
          {batchEntries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {batchEntries.length} documento{batchEntries.length !== 1 ? "s" : ""} cargado{batchEntries.length !== 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => setBatchEntries([])}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Limpiar todo
                </Button>
              </div>
              <div className="divide-y divide-border rounded-lg border overflow-hidden">
                {batchEntries.map((entry, idx) => (
                  <div key={entry.file.name + idx} className="flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{entry.file.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <DetectionBadge status={entry.detectionStatus} />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEntry(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Individual mode
    if (pdfFile) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{pdfFile.name}</p>
                <p className="text-sm text-muted-foreground">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { onPDFSelect(null); onTotalPagesChange(0); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-xs px-1">
            <DetectionBadge status={singleDetectionStatus} />
          </div>
        </div>
      );
    }

    return (
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl bg-card/80 transition-all ${
          isLoading ? "opacity-50 cursor-wait border-muted" : "hover:border-primary/50 cursor-pointer border-border"
        }`}
      >
        <input type="file" accept=".pdf" onChange={handleFileInput} className="hidden" id="auto-pdf-upload" />
        <label htmlFor="auto-pdf-upload" className="flex flex-col items-center cursor-pointer w-full">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          <p className="text-base sm:text-lg font-semibold mb-1">Arrastra tu PDF aquí</p>
          <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground/60 mt-1">PDF (máx. 20&nbsp;MB)</p>
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* PDF Upload */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {batchMode ? "Documentos PDF" : "Documento PDF"}
          </CardTitle>
          <CardDescription>
            {batchMode
              ? "Selecciona uno o varios PDFs institucionales"
              : "Selecciona el documento PDF al que se agregará la firma"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">{renderPDFZone()}</CardContent>
      </Card>

      {/* Signature Image Upload */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Imagen de Firma
          </CardTitle>
          <CardDescription>
            {batchMode
              ? "Esta imagen se insertará en todos los documentos"
              : "Selecciona la imagen de la firma a insertar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signatureImage ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <img src={signatureImage} alt="Firma" className="w-20 h-12 object-contain border rounded" />
                <div>
                  <p className="font-medium">Imagen de firma cargada</p>
                  <p className="text-sm text-muted-foreground">PNG o JPG (puedes cambiarla)</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const input = document.getElementById("auto-signature-upload") as HTMLInputElement;
                  if (input) input.value = "";
                  onSignatureImageSelect("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl bg-card/80">
              <input type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} className="hidden" id="auto-signature-upload" />
              <label
                htmlFor="auto-signature-upload"
                className={`flex flex-col items-center cursor-pointer w-full ${isValidatingImage ? "opacity-50 cursor-wait" : ""}`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-semibold mb-1">Sube la imagen de la firma</p>
                <p className="text-sm text-muted-foreground">PNG o JPG (máx. 5&nbsp;MB)</p>
              </label>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Export batch entries getter for parent to read
export type { PDFFileEntry };
