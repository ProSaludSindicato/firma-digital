import { useRef, useState, useEffect, useCallback, type Ref } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pencil, Upload, X, Trash2, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile, useIsLandscapeMobile } from "@/hooks/use-mobile";
import { validateImageFile, validateImageDimensions } from "@/lib/validation";
import { compressImage, validateAndCompressImage } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { AuditEventType } from "@/hooks/useAuditTrail";

/** Grosor del trazo (signature_pad: min/max ancho de línea según presión/velocidad). */
const SIGNATURE_PAD_MIN_WIDTH = 2.5;
const SIGNATURE_PAD_MAX_WIDTH = 5;

const DESKTOP_PAD_HEIGHT =
  "h-[clamp(176px,calc(var(--app-height,100dvh)-20rem),300px)] md:h-[clamp(200px,calc(var(--app-height,100dvh)-20rem),376px)] lg:h-[clamp(220px,calc(var(--app-height,100dvh)-20rem),432px)]";

function SignatureImageUploadNotice({ className }: { className?: string }) {
  return (
    <Alert
      role="note"
      className={cn(
        "border-amber-200/90 bg-amber-50/80 py-3 text-left dark:border-amber-800/60 dark:bg-amber-950/30 [&>svg]:text-amber-800 dark:[&>svg]:text-amber-400",
        className,
      )}
    >
      <Info className="h-4 w-4" aria-hidden />
      <AlertDescription className="text-xs leading-snug text-amber-950 sm:text-sm dark:text-amber-50/95">
        <span className="font-semibold">Importante: </span>
        sube una imagen válida de tu firma manuscrita (solo la firma, legible y con buen contraste). PNG o JPG.
      </AlertDescription>
    </Alert>
  );
}

function SignatureGuide({ variant }: { variant: "mobile" | "desktop" }) {
  if (variant === "desktop") {
    return (
      <>
        <div className="pointer-events-none absolute bottom-16 left-8 right-8 border-b border-muted-foreground/15" />
        <div className="pointer-events-none absolute bottom-[52px] left-8 select-none text-[10px] text-muted-foreground/30">
          Firma
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute bottom-[min(28%,7.5rem)] left-3 right-3 border-b border-muted-foreground/20" />
      <div className="pointer-events-none absolute bottom-[calc(min(28%,7.5rem)_+_10px)] left-3 select-none text-[10px] text-muted-foreground/35">
        Firma
      </div>
    </>
  );
}

interface SignaturePadBoxProps {
  id?: string;
  className?: string;
  showingExisting: boolean;
  existingSrc?: string | null;
  hasStroke: boolean;
  showPlaceholder: boolean;
  signaturePadKey: number;
  containerRef?: Ref<HTMLDivElement>;
  signatureRef: Ref<SignatureCanvas>;
  onBeginStroke: () => void;
  guide: "mobile" | "desktop";
}

function SignaturePadBox({
  id,
  className,
  showingExisting,
  existingSrc,
  hasStroke,
  showPlaceholder,
  signaturePadKey,
  containerRef,
  signatureRef,
  onBeginStroke,
  guide,
}: SignaturePadBoxProps) {
  return (
    <div
      id={id}
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        showingExisting && "flex items-center justify-center",
        className,
      )}
    >
      {showingExisting && existingSrc ? (
        <img
          src={existingSrc}
          alt="Tu firma actual"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <>
          {showPlaceholder && !hasStroke && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-30">
              <p className="text-sm text-muted-foreground">Firma aquí</p>
            </div>
          )}
          <SignatureGuide variant={guide} />
          <SignatureCanvas
            key={signaturePadKey}
            ref={signatureRef}
            onBegin={onBeginStroke}
            canvasProps={{
              className: "h-full w-full",
              style: { width: "100%", height: "100%", touchAction: "none" },
            }}
            backgroundColor="transparent"
            penColor="#1e293b"
            minWidth={SIGNATURE_PAD_MIN_WIDTH}
            maxWidth={SIGNATURE_PAD_MAX_WIDTH}
          />
        </>
      )}
    </div>
  );
}

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureCreate: (signature: string) => void;
  onClearSignature?: () => void;
  currentSignature?: string | null;
  onTrackEvent?: (type: AuditEventType, metadata?: Record<string, unknown>) => void;
}

export const SignatureModal = ({
  isOpen,
  onClose,
  onSignatureCreate,
  currentSignature,
  onTrackEvent,
}: SignatureModalProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("draw");
  /** Remounts SignaturePad so internal buffer + DPR match the laid-out box (rotation / delayed mobile layout). */
  const [signaturePadKey, setSignaturePadKey] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);
  const [isRedrawing, setIsRedrawing] = useState(false);
  const isMobile = useIsMobile();
  const isLandscapeMobile = useIsLandscapeMobile();
  const showingExistingSignature = Boolean(currentSignature) && !isRedrawing;

  const scheduleSignaturePadRemount = useCallback(() => {
    window.setTimeout(() => {
      setSignaturePadKey((k) => k + 1);
      setHasStroke(false);
    }, 150);
  }, []);

  // iOS often fires orientationchange before the flex layout / DPR settle; remount after a short delay.
  useEffect(() => {
    if (!isOpen || activeTab !== "draw" || showingExistingSignature) return;
    const onOrientationChange = () => scheduleSignaturePadRemount();
    window.addEventListener("orientationchange", onOrientationChange);
    return () => window.removeEventListener("orientationchange", onOrientationChange);
  }, [isOpen, activeTab, showingExistingSignature, scheduleSignaturePadRemount]);

  // react-signature-canvas only listens to window resize; container size can change without a reliable resize
  // (or with one that runs too early). Remount when the drawable box actually changes size on phone layouts.
  useEffect(() => {
    if (!isOpen || activeTab !== "draw" || showingExistingSignature) return;
    if (!isMobile && !isLandscapeMobile) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let debounceTimer: number | undefined;
    let lastW = 0;
    let lastH = 0;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) return;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        setSignaturePadKey((k) => k + 1);
        setHasStroke(false);
      }, 80) as unknown as number;
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    };
  }, [isOpen, activeTab, showingExistingSignature, isMobile, isLandscapeMobile]);

  const handleClearCanvas = () => {
    signatureRef.current?.clear();
    setHasStroke(false);
  };

  const handleClear = () => {
    if (showingExistingSignature) {
      setIsRedrawing(true);
      setActiveTab("draw");
      setHasStroke(false);
      return;
    }
    handleClearCanvas();
  };

  // Reset state when reopening
  useEffect(() => {
    if (isOpen) {
      setHasStroke(false);
      setIsRedrawing(false);
      setActiveTab("draw");
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
    }
  }, [isOpen, currentSignature]);

  // Get high-quality signature with proper trimming
  const handleSaveSignature = async () => {
    if (activeTab !== "draw") {
      onClose();
      return;
    }

    if (!signatureRef.current) {
      onClose();
      return;
    }

    const canvas = signatureRef.current.getCanvas();
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      onClose();
      return;
    }

    const isEmpty = signatureRef.current.isEmpty();

    if (isEmpty) {
      onClose();
      return;
    }

    onTrackEvent?.("signature_drawn");
    const trimmedCanvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const trimmedCtx = trimmedCanvas.getContext("2d");

    if (!ctx || !trimmedCtx) {
      const dataUrl = signatureRef.current.toDataURL("image/png");
      onSignatureCreate(dataUrl);
      onClose();
      return;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const trimmedWidth = maxX - minX;
    const trimmedHeight = maxY - minY;

    if (trimmedWidth > 0 && trimmedHeight > 0) {
      trimmedCanvas.width = trimmedWidth;
      trimmedCanvas.height = trimmedHeight;

      trimmedCtx.imageSmoothingEnabled = true;
      trimmedCtx.imageSmoothingQuality = "high";

      trimmedCtx.drawImage(
        canvas,
        minX,
        minY,
        trimmedWidth,
        trimmedHeight,
        0,
        0,
        trimmedWidth,
        trimmedHeight,
      );

      const dataUrl = trimmedCanvas.toDataURL("image/png", 1.0);

      try {
        const img = new Image();
        img.onload = async () => {
          if (img.width > 800 || img.height > 400) {
            const compressed = await compressImage(dataUrl, {
              maxWidth: 800,
              maxHeight: 400,
              quality: 1.0,
              format: "png",
            });
            onSignatureCreate(compressed);
          } else {
            onSignatureCreate(dataUrl);
          }
        };
        img.onerror = () => {
          onSignatureCreate(dataUrl);
        };
        img.src = dataUrl;
      } catch (error) {
        console.warn("Error procesando firma, usando original:", error);
        onSignatureCreate(dataUrl);
      }
    } else {
      const dataUrl = signatureRef.current.toDataURL("image/png");

      try {
        const img = new Image();
        img.onload = async () => {
          if (img.width > 800 || img.height > 400) {
            const compressed = await compressImage(dataUrl, {
              maxWidth: 800,
              maxHeight: 400,
              quality: 1.0,
              format: "png",
            });
            onSignatureCreate(compressed);
          } else {
            onSignatureCreate(dataUrl);
          }
        };
        img.onerror = () => {
          onSignatureCreate(dataUrl);
        };
        img.src = dataUrl;
      } catch (error) {
        console.warn("Error procesando firma, usando original:", error);
        onSignatureCreate(dataUrl);
      }
    }

    onClose();
  };

  const handlePrimaryAction = () => {
    if (showingExistingSignature) {
      onClose();
      return;
    }
    void handleSaveSignature();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: "Error de validación",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      const compressedImage = await validateAndCompressImage(file, {
        maxWidth: 800,
        maxHeight: 400,
        quality: 0.9,
        format: "jpeg",
      });

      const img = new Image();
      img.onload = () => {
        const dimValidation = validateImageDimensions(img.width, img.height);
        if (!dimValidation.valid) {
          toast({
            title: "Error de validación",
            description: dimValidation.error,
            variant: "destructive",
          });
          return;
        }

        onTrackEvent?.("signature_uploaded", { width: img.width, height: img.height });
        onSignatureCreate(compressedImage);
        onClose();
      };
      img.onerror = () => {
        toast({
          title: "Error",
          description: "No se pudo cargar la imagen. Por favor, intenta con otra imagen.",
          variant: "destructive",
        });
      };
      img.src = compressedImage;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al procesar la imagen";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const padBoxProps = {
    showingExisting: showingExistingSignature,
    existingSrc: currentSignature,
    hasStroke,
    signaturePadKey,
    signatureRef,
    onBeginStroke: () => setHasStroke(true),
  };

  if (isLandscapeMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="m-0 flex h-[var(--app-height,100dvh)] w-screen max-h-none max-w-none !max-w-none flex-col gap-0 rounded-none border-none p-0 [&>button]:hidden"
          aria-describedby={undefined}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">
            {currentSignature ? "Tu firma" : "Dibuja tu firma"}
          </DialogTitle>
          <div
            className="min-h-0 flex-1 p-2 pb-1"
            style={{
              paddingTop: "max(0.5rem, env(safe-area-inset-top))",
              paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
              paddingRight: "max(0.5rem, env(safe-area-inset-right))",
            }}
          >
            {activeTab === "draw" ? (
              <SignaturePadBox
                id="tour-signature-canvas"
                containerRef={containerRef}
                className="h-full rounded-lg border-2 border-dashed border-border bg-accent"
                showPlaceholder
                guide="mobile"
                {...padBoxProps}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-lg border-2 border-dashed border-border bg-accent">
                <SignatureImageUploadNotice className="shrink-0" />
                <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-2">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="signature-modal-upload-landscape"
                  />
                  <label
                    htmlFor="signature-modal-upload-landscape"
                    className="flex cursor-pointer flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Toca para subir imagen</span>
                    <span className="text-xs text-muted-foreground/60">PNG o JPG</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div
            className="flex shrink-0 items-center gap-1 border-t border-border bg-muted/50 px-2"
            style={{
              paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))",
              paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
              paddingRight: "max(0.5rem, env(safe-area-inset-right))",
            }}
          >
            <Button
              variant="ghost"
              className="flex h-10 shrink-0 items-center gap-1.5 px-2.5 touch-manipulation"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="text-xs font-medium">Cerrar</span>
            </Button>

            <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex h-9 flex-row gap-0.5 bg-transparent p-0.5">
                <TabsTrigger
                  value="draw"
                  className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs touch-manipulation data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  Dibujar
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs touch-manipulation data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Upload className="h-3.5 w-3.5 shrink-0" />
                  Subir
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex-1" />

            <Button
              variant="ghost"
              className="flex h-10 shrink-0 items-center gap-1.5 px-2.5 touch-manipulation"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-xs font-medium">Limpiar</span>
            </Button>

            <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

            <Button
              onClick={handlePrimaryAction}
              className="flex h-10 shrink-0 items-center gap-1.5 px-3 touch-manipulation"
            >
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                {showingExistingSignature ? "Mantener" : "Usar firma"}
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="m-0 flex h-[var(--app-height,100dvh)] w-screen max-h-none max-w-none !max-w-none flex-col gap-0 rounded-none border-none p-0 [&>button]:hidden"
          aria-describedby={undefined}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-2"
            style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-base font-semibold">
              {currentSignature ? "Tu firma" : "Dibuja tu firma"}
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col px-2">
            <TabsList id="tour-signature-tabs" className="mt-2 grid h-9 w-full shrink-0 grid-cols-2">
              <TabsTrigger value="draw" className="flex items-center gap-1.5 py-1 text-sm">
                <Pencil className="h-3.5 w-3.5" />
                Dibujar
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-1.5 py-1 text-sm">
                <Upload className="h-3.5 w-3.5" />
                Subir
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="draw"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden pt-2"
            >
              <SignaturePadBox
                id="tour-signature-canvas"
                containerRef={containerRef}
                className="min-h-0 flex-1 rounded-lg border-2 border-dashed border-border bg-accent"
                showPlaceholder
                guide="mobile"
                {...padBoxProps}
              />
              <div
                className="flex shrink-0 gap-2 pt-3"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="outline"
                  onClick={handleClear}
                  size="lg"
                  className="h-12 flex-1 text-base"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
                <Button
                  id="tour-signature-save"
                  onClick={handlePrimaryAction}
                  size="lg"
                  className="h-12 flex-1 text-base"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {showingExistingSignature ? "Mantener" : "Usar firma"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="upload"
              className="mt-0 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-2"
            >
              <SignatureImageUploadNotice className="shrink-0" />
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border-2 border-dashed border-border bg-accent">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="signature-modal-upload-mobile"
                />
                <label
                  htmlFor="signature-modal-upload-mobile"
                  className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center"
                >
                  <Upload className="mb-3 h-12 w-12 text-muted-foreground" />
                  <span className="px-4 text-center text-base text-muted-foreground">
                    Toca para subir una imagen de tu firma
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">PNG o JPG</span>
                </label>
              </div>
              <div
                className="flex shrink-0 gap-2 pt-3"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <div className="h-12 flex-1" />
                <div className="h-12 flex-1" />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex w-[calc(100%-2rem)] max-h-[92dvh] flex-col gap-3 overflow-y-auto p-6 sm:max-w-2xl md:max-w-3xl md:gap-4 lg:max-w-4xl"
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 space-y-1.5 text-left">
          <DialogTitle className="text-lg">
            {currentSignature ? "Tu firma" : "Agregar firma"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList id="tour-signature-tabs" className="mb-0 grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Dibujar
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Subir imagen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-3">
            <SignaturePadBox
              id="tour-signature-canvas"
              className={cn(
                "w-full rounded-lg border border-border bg-white dark:bg-accent",
                DESKTOP_PAD_HEIGHT,
              )}
              showPlaceholder={false}
              guide="desktop"
              {...padBoxProps}
            />
            <div className="mt-3 flex shrink-0 gap-2 md:mt-4">
              <Button variant="outline" onClick={handleClear} className="flex-1">
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
              <Button id="tour-signature-save" onClick={handlePrimaryAction} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                {showingExistingSignature ? "Mantener" : "Usar firma"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-3 space-y-3">
            <SignatureImageUploadNotice />
            <input
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleImageUpload}
              className="hidden"
              id="signature-modal-upload"
            />
            <label
              htmlFor="signature-modal-upload"
              className={cn(
                "flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-white transition-colors hover:bg-muted/20 dark:bg-accent",
                DESKTOP_PAD_HEIGHT,
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <span className="block text-sm font-medium text-foreground">
                  Sube una imagen de tu firma
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">PNG o JPG, máximo 5 MB</span>
              </div>
            </label>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
