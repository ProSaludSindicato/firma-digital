import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, Image as ImageIcon, X, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validatePDFFile, validatePDFIntegrity, validateImageFile } from "@/lib/validation";
import { validateAndCompressImage } from "@/lib/imageCompression";
import { toast } from "@/hooks/use-toast";
import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";
import { DEFAULT_AUTO_SIGN_CONFIG, AUTO_SIGN_IMAGE_OPTIONS, AI_SEARCH_CONFIG } from "@/lib/autoSignConfig";
import { createSignatureLocationProvider, calculateSignaturePosition } from "@/lib/signatureLocationService";

interface AutoSignatureUploaderProps {
  onPDFSelect: (file: File | null) => void;
  onSignatureImageSelect: (imageDataUrl: string) => void;
  onConfigChange: (config: AutoSignatureConfig) => void;
  pdfFile: File | null;
  signatureImage: string | null;
  signatureConfig: AutoSignatureConfig | null;
  onTotalPagesChange: (pages: number) => void;
}

type DetectionStatus = "idle" | "detecting" | "found" | "fallback" | "error";

export const AutoSignatureUploader = ({
  onPDFSelect,
  onSignatureImageSelect,
  onConfigChange,
  pdfFile,
  signatureImage,
  signatureConfig,
  onTotalPagesChange,
}: AutoSignatureUploaderProps) => {
  const [isValidatingPDF, setIsValidatingPDF] = useState(false);
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("idle");

  // Detección automática de la posición de firma al cargar un PDF
  useEffect(() => {
    if (!pdfFile) {
      setDetectionStatus("idle");
      return;
    }

    let cancelled = false;

    const detect = async () => {
      setDetectionStatus("detecting");
      try {
        const provider = createSignatureLocationProvider();
        const textLocation = await provider.findTextInPDF({
          pdfFile,
          searchText: AI_SEARCH_CONFIG.searchText,
          pageNumber: AI_SEARCH_CONFIG.defaultSearchPage,
        });

        if (cancelled) return;

        if (textLocation) {
          const signaturePos = calculateSignaturePosition(
            textLocation,
            AI_SEARCH_CONFIG.offsetX,
            AI_SEARCH_CONFIG.offsetY,
          );
          onConfigChange({
            page: signaturePos.page,
            x: signaturePos.x,
            y: signaturePos.y,
            width: DEFAULT_AUTO_SIGN_CONFIG.width,
            height: DEFAULT_AUTO_SIGN_CONFIG.height,
          });
          setDetectionStatus("found");
        } else {
          // No se encontró la posición: usar valores por defecto
          onConfigChange(DEFAULT_AUTO_SIGN_CONFIG);
          setDetectionStatus("fallback");
        }
      } catch {
        if (cancelled) return;
        onConfigChange(DEFAULT_AUTO_SIGN_CONFIG);
        setDetectionStatus("error");
      }
    };

    detect();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile]);

  // Reportar el número de páginas del PDF al padre
  useEffect(() => {
    if (!pdfFile) {
      onTotalPagesChange(0);
      return;
    }
    import("pdf-lib").then(async ({ PDFDocument }) => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const doc = await PDFDocument.load(arrayBuffer);
        onTotalPagesChange(doc.getPages().length);
      } catch {
        // no critical
      }
    });
  }, [pdfFile, onTotalPagesChange]);

  const handlePDFValidation = useCallback(
    async (file: File | null) => {
      if (!file) return;

      setIsValidatingPDF(true);
      try {
        const validation = validatePDFFile(file);
        if (!validation.valid) {
          toast({ title: "Error de validación", description: validation.error, variant: "destructive" });
          return;
        }
        const integrityCheck = await validatePDFIntegrity(file);
        if (!integrityCheck.valid) {
          toast({ title: "Error de validación", description: integrityCheck.error, variant: "destructive" });
          return;
        }
        onPDFSelect(file);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al validar el archivo PDF",
          variant: "destructive",
        });
      } finally {
        setIsValidatingPDF(false);
      }
    },
    [onPDFSelect],
  );

  const handlePDFDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handlePDFValidation(file);
    },
    [handlePDFValidation],
  );

  const handlePDFInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handlePDFValidation(file);
      e.target.value = "";
    },
    [handlePDFValidation],
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsValidatingImage(true);
      try {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast({ title: "Error de validación", description: validation.error, variant: "destructive" });
          return;
        }
        const isPNG = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        const compressedImage = await validateAndCompressImage(file, {
          maxWidth: AUTO_SIGN_IMAGE_OPTIONS.maxWidth,
          maxHeight: AUTO_SIGN_IMAGE_OPTIONS.maxHeight,
          quality: AUTO_SIGN_IMAGE_OPTIONS.quality,
          format: isPNG ? "png" : "jpeg",
        });
        onSignatureImageSelect(compressedImage);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al procesar la imagen",
          variant: "destructive",
        });
      } finally {
        setIsValidatingImage(false);
        e.target.value = "";
      }
    },
    [onSignatureImageSelect],
  );

  // Badge de estado de la detección automática
  const DetectionBadge = () => {
    if (detectionStatus === "idle") return null;

    const configs: Record<Exclude<DetectionStatus, "idle">, { icon: React.ReactNode; text: string; className: string }> = {
      detecting: {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        text: "Detectando posición de firma…",
        className: "text-muted-foreground",
      },
      found: {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />,
        text: "Posición detectada automáticamente",
        className: "text-green-700 dark:text-green-400",
      },
      fallback: {
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
        text: "Posición no detectada — usando valores por defecto",
        className: "text-amber-600 dark:text-amber-400",
      },
      error: {
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
        text: "Error al detectar — usando valores por defecto",
        className: "text-amber-600 dark:text-amber-400",
      },
    };

    const cfg = configs[detectionStatus];
    return (
      <div className={`flex items-center gap-1.5 text-xs ${cfg.className}`}>
        {cfg.icon}
        <span>{cfg.text}</span>
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
            Documento PDF
          </CardTitle>
          <CardDescription>Selecciona el documento PDF al que se agregará la firma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pdfFile ? (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">{pdfFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onPDFSelect(null);
                    onTotalPagesChange(0);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <DetectionBadge />
            </>
          ) : (
            <div
              onDrop={handlePDFDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl bg-card/80 transition-all ${
                isValidatingPDF
                  ? "opacity-50 cursor-wait border-muted"
                  : "hover:border-primary/50 cursor-pointer border-border"
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handlePDFInput}
                className="hidden"
                id="auto-pdf-upload"
              />
              <label htmlFor="auto-pdf-upload" className="flex flex-col items-center cursor-pointer w-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-semibold mb-1">Arrastra tu PDF aquí</p>
                <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF (máx. 10&nbsp;MB)</p>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Image Upload */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Imagen de Firma
          </CardTitle>
          <CardDescription>Selecciona la imagen de la firma a insertar</CardDescription>
        </CardHeader>
        <CardContent>
          {signatureImage ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <img
                  src={signatureImage}
                  alt="Firma"
                  className="w-20 h-12 object-contain border rounded"
                />
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
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageUpload}
                className="hidden"
                id="auto-signature-upload"
              />
              <label
                htmlFor="auto-signature-upload"
                className={`flex flex-col items-center cursor-pointer w-full ${
                  isValidatingImage ? "opacity-50 cursor-wait" : ""
                }`}
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
