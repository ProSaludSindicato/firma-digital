import { useRef, useState, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pencil, Upload, X, Trash2, Check, Eye, Info } from "lucide-react";
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
  onClearSignature,
  currentSignature,
  onTrackEvent,
}: SignatureModalProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(currentSignature ? "preview" : "draw");
  /** Remounts SignaturePad so internal buffer + DPR match the laid-out box (rotation / delayed mobile layout). */
  const [signaturePadKey, setSignaturePadKey] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);
  const isMobile = useIsMobile();
  const isLandscapeMobile = useIsLandscapeMobile();

  const scheduleSignaturePadRemount = useCallback(() => {
    window.setTimeout(() => {
      setSignaturePadKey((k) => k + 1);
      setHasStroke(false);
    }, 150);
  }, []);

  // iOS often fires orientationchange before the flex layout / DPR settle; remount after a short delay.
  useEffect(() => {
    if (!isOpen || activeTab !== "draw") return;
    const onOrientationChange = () => scheduleSignaturePadRemount();
    window.addEventListener("orientationchange", onOrientationChange);
    return () => window.removeEventListener("orientationchange", onOrientationChange);
  }, [isOpen, activeTab, scheduleSignaturePadRemount]);

  // react-signature-canvas only listens to window resize; container size can change without a reliable resize
  // (or with one that runs too early). Remount when the drawable box actually changes size on phone layouts.
  useEffect(() => {
    if (!isOpen || activeTab !== "draw") return;
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
  }, [isOpen, activeTab, isMobile, isLandscapeMobile]);

  // Handle clearing signature and switching to new signature flow
  const handleClearAndCreateNew = () => {
    onClearSignature?.();
    // Close modal - user will need to open again to create new signature
    // This ensures clean state
    onClose();
  };

  // Reset state when reopening
  useEffect(() => {
    if (isOpen) {
      setHasStroke(false);
      // When editing (has currentSignature), show preview. Otherwise show draw
      setActiveTab(currentSignature ? "preview" : "draw");
      // Clear canvas when modal opens to ensure clean state
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
    }
  }, [isOpen, currentSignature]);


  // Get high-quality signature with proper trimming
  const handleSaveSignature = async () => {
    // Handle different tabs
    if (activeTab === "preview") {
      // In preview tab, just close (user wants to keep current signature)
      onClose();
      return;
    }
    
    // For draw tab, check if we have a signature to save
    if (activeTab === "draw") {
      if (!signatureRef.current) {
        onClose();
        return;
      }
      
      // Check if canvas has content - verify both isEmpty() and actual pixel data
      // Add a small delay to ensure canvas is fully rendered
      const canvas = signatureRef.current.getCanvas();
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        onClose();
        return;
      }
      
      const isEmpty = signatureRef.current.isEmpty();
      
      if (isEmpty) {
        // Canvas is empty - if we have a current signature, keep it; otherwise close
        onClose();
        return;
      }
      
      onTrackEvent?.("signature_drawn");
      // Create a new canvas for the trimmed, high-quality output
      const trimmedCanvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const trimmedCtx = trimmedCanvas.getContext('2d');
      
      if (!ctx || !trimmedCtx) {
        const dataUrl = signatureRef.current.toDataURL("image/png");
        onSignatureCreate(dataUrl);
        onClose();
        return;
      }

      // Get image data to find the bounding box of the signature
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;
      
      let minX = width, minY = height, maxX = 0, maxY = 0;
      
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
      
      // Add padding around the signature
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
        
        // Enable high-quality image smoothing
        trimmedCtx.imageSmoothingEnabled = true;
        trimmedCtx.imageSmoothingQuality = 'high';
        
        // Draw the trimmed portion
        trimmedCtx.drawImage(
          canvas,
          minX, minY, trimmedWidth, trimmedHeight,
          0, 0, trimmedWidth, trimmedHeight
        );
        
        // For drawn signatures, keep PNG with transparency
        // Only resize if too large, but maintain PNG format to preserve transparency
        const dataUrl = trimmedCanvas.toDataURL("image/png", 1.0);
        
        // Only compress/resize if the image is very large, but keep PNG format
        try {
          const img = new Image();
          img.onload = async () => {
            // Only resize if larger than max dimensions
            if (img.width > 800 || img.height > 400) {
              const compressed = await compressImage(dataUrl, {
                maxWidth: 800,
                maxHeight: 400,
                quality: 1.0, // Maximum quality for PNG
                format: 'png', // Keep PNG to preserve transparency
              });
              onSignatureCreate(compressed);
            } else {
              // Use original if already small enough
              onSignatureCreate(dataUrl);
            }
          };
          img.onerror = () => {
            // Fallback to original if image load fails
            onSignatureCreate(dataUrl);
          };
          img.src = dataUrl;
        } catch (error) {
          // Fallback to original if compression fails
          console.warn('Error procesando firma, usando original:', error);
          onSignatureCreate(dataUrl);
        }
      } else {
        // For drawn signatures, keep PNG with transparency
        const dataUrl = signatureRef.current.toDataURL("image/png");
        
        // Only resize if too large, but maintain PNG format
        try {
          const img = new Image();
          img.onload = async () => {
            // Only resize if larger than max dimensions
            if (img.width > 800 || img.height > 400) {
              const compressed = await compressImage(dataUrl, {
                maxWidth: 800,
                maxHeight: 400,
                quality: 1.0, // Maximum quality for PNG
                format: 'png', // Keep PNG to preserve transparency
              });
              onSignatureCreate(compressed);
            } else {
              // Use original if already small enough
              onSignatureCreate(dataUrl);
            }
          };
          img.onerror = () => {
            // Fallback to original if image load fails
            onSignatureCreate(dataUrl);
          };
          img.src = dataUrl;
        } catch (error) {
          // Fallback to original if compression fails
          console.warn('Error procesando firma, usando original:', error);
          onSignatureCreate(dataUrl);
        }
      }
      
      onClose();
    }
  };

  const handleClearCanvas = () => {
    signatureRef.current?.clear();
    setHasStroke(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate image file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: "Error de validación",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      // Validate and compress image
      const compressedImage = await validateAndCompressImage(file, {
        maxWidth: 800,
        maxHeight: 400,
        quality: 0.9,
        format: 'jpeg',
      });

      // Verify dimensions after compression
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
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Error al procesar la imagen";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Reset input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Full-screen mobile modal with safe area support

  // isLandscapeMobile covers ALL phone sizes in landscape (including modern wide phones
  // where useIsMobile() returns false because innerWidth ≥ 768 px in landscape).
  if (isLandscapeMobile) {
    // Landscape layout: full-width canvas + compact bottom action bar
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="w-screen h-[100dvh] max-w-none max-h-none m-0 p-0 rounded-none border-none flex flex-col [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Canvas / content — takes all available height above the bar */}
          <div
            className="flex-1 min-h-0 p-2 pb-1"
            style={{
              paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
              paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
            }}
          >
            {activeTab === "preview" && currentSignature ? (
              <div className="h-full border-2 border-dashed border-border rounded-lg bg-accent flex flex-col items-center justify-center p-4">
                <img
                  src={currentSignature}
                  alt="Tu firma actual"
                  className="max-w-full max-h-full object-contain"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAndCreateNew}
                  className="mt-3 shrink-0"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar y crear nueva
                </Button>
              </div>
            ) : activeTab === "draw" ? (
              <div
                ref={containerRef}
                className="h-full border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent relative"
              >
                {!hasStroke && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-30">
                    <p className="text-muted-foreground text-sm">Firma aquí</p>
                  </div>
                )}
                <div className="absolute bottom-[min(28%,7.5rem)] left-3 right-3 border-b border-muted-foreground/20 pointer-events-none" />
                <div className="absolute bottom-[calc(min(28%,7.5rem)_+_10px)] left-3 text-[10px] text-muted-foreground/35 pointer-events-none select-none">
                  Firma
                </div>
                <SignatureCanvas
                  key={signaturePadKey}
                  ref={signatureRef}
                  onBegin={() => setHasStroke(true)}
                  canvasProps={{
                    className: "w-full h-full",
                    style: { width: "100%", height: "100%", touchAction: "none" },
                  }}
                  backgroundColor="transparent"
                  penColor="#1e293b"
                  minWidth={SIGNATURE_PAD_MIN_WIDTH}
                  maxWidth={SIGNATURE_PAD_MAX_WIDTH}
                />
              </div>
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

          {/* Bottom action bar */}
          <div
            className="flex items-center gap-1 bg-muted/50 border-t border-border shrink-0 px-2"
            style={{
              paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
            }}
          >
            {/* Close */}
            <Button
              variant="ghost"
              className="flex items-center gap-1.5 h-10 px-2.5 touch-manipulation shrink-0"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
              <span className="text-xs font-medium">Cerrar</span>
            </Button>

            <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

            {/* Mode tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-row h-9 bg-transparent gap-0.5 p-0.5">
                {currentSignature ? (
                  <TabsTrigger
                    value="preview"
                    className="flex items-center gap-1.5 h-8 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md touch-manipulation"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    Actual
                  </TabsTrigger>
                ) : (
                  <TabsTrigger
                    value="draw"
                    className="flex items-center gap-1.5 h-8 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md touch-manipulation"
                  >
                    <Pencil className="w-3.5 h-3.5 shrink-0" />
                    Dibujar
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="upload"
                  className="flex items-center gap-1.5 h-8 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md touch-manipulation"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  Subir
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Clear */}
            <Button
              variant="ghost"
              className="flex items-center gap-1.5 h-10 px-2.5 touch-manipulation shrink-0"
              onClick={handleClearCanvas}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs font-medium">Limpiar</span>
            </Button>

            <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

            {/* Save */}
            <Button
              onClick={handleSaveSignature}
              className="flex items-center gap-1.5 h-10 px-3 touch-manipulation shrink-0"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Usar firma</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Portrait phones: full-screen dialog (touch-friendly)
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="w-screen h-[100dvh] max-w-none max-h-none m-0 p-0 rounded-none border-none flex flex-col [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header with safe area padding */}
          <div 
            className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0"
            style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
            <h2 className="text-base font-semibold">
              {currentSignature ? "Tu firma" : "Dibuja tu firma"}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearCanvas}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs for mobile */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0 h-full">
            <TabsList id="tour-signature-tabs" className={`grid w-full mx-3 mt-2 shrink-0 h-9 ${currentSignature ? 'grid-cols-2' : 'grid-cols-2'}`} style={{ width: 'calc(100% - 1.5rem)' }}>
              {currentSignature && (
                <TabsTrigger value="preview" className="flex items-center gap-1.5 text-sm py-1">
                  <Eye className="w-3.5 h-3.5" />
                  Tu firma
                </TabsTrigger>
              )}
              {!currentSignature && (
                <TabsTrigger value="draw" className="flex items-center gap-1.5 text-sm py-1">
                  <Pencil className="w-3.5 h-3.5" />
                  Dibujar
                </TabsTrigger>
              )}
              <TabsTrigger value="upload" className="flex items-center gap-1.5 text-sm py-1">
                <Upload className="w-3.5 h-3.5" />
                Subir
              </TabsTrigger>
            </TabsList>

            {currentSignature && (
              <TabsContent value="preview" className="flex-1 flex flex-col m-0 p-3 overflow-hidden min-h-0 mt-0">
                <div className="flex-1 min-h-0 border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent relative flex items-center justify-center p-4">
                  <img
                    src={currentSignature}
                    alt="Tu firma actual"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div 
                  className="shrink-0 pt-3 flex gap-2"
                  style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
                >
                  <Button 
                    variant="outline"
                    onClick={handleClearAndCreateNew}
                    size="lg" 
                    className="flex-1 h-12 text-xs sm:text-sm md:text-base px-2 sm:px-4"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate text-xs sm:text-sm md:text-base">
                      {isMobile ? "Limpiar" : "Limpiar y crear nueva"}
                    </span>
                  </Button>
                  <Button 
                    onClick={onClose}
                    size="lg" 
                    className="flex-1 h-12 text-xs sm:text-sm md:text-base px-2 sm:px-4 min-w-0"
                  >
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Mantener</span>
                  </Button>
                </div>
              </TabsContent>
            )}

            <TabsContent value="draw" className="flex-1 flex flex-col m-0 p-3 overflow-hidden min-h-0 mt-0">
              {/* Canvas container - takes all available space */}
              <div 
                id="tour-signature-canvas"
                ref={containerRef}
                className="flex-1 min-h-0 border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent relative"
              >
                {!hasStroke && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-30">
                    <p className="text-muted-foreground text-sm">Firma aquí</p>
                  </div>
                )}
                <div className="absolute bottom-[min(28%,7.5rem)] left-3 right-3 border-b border-muted-foreground/20 pointer-events-none" />
                <div className="absolute bottom-[calc(min(28%,7.5rem)_+_10px)] left-3 text-[10px] text-muted-foreground/35 pointer-events-none select-none">
                  Firma
                </div>

                {/* Use display dimensions for canvas, not scaled - let library handle touch properly */}
                <SignatureCanvas
                  key={signaturePadKey}
                  ref={signatureRef}
                  onBegin={() => setHasStroke(true)}
                  canvasProps={{
                    className: "w-full h-full",
                    style: {
                      width: "100%",
                      height: "100%",
                      touchAction: "none",
                    },
                  }}
                  backgroundColor="transparent"
                  penColor="#1e293b"
                  minWidth={SIGNATURE_PAD_MIN_WIDTH}
                  maxWidth={SIGNATURE_PAD_MAX_WIDTH}
                />
              </div>

              {/* Large confirm button with safe area padding */}
              <div 
                className="shrink-0 pt-3"
                style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
              >
                <Button 
                  id="tour-signature-save"
                  onClick={handleSaveSignature} 
                  size="lg" 
                  className="w-full h-12 text-base"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Usar esta firma
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-0 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden m-0 p-3">
              <SignatureImageUploadNotice className="shrink-0" />
              {/* Upload area - same layout and position as draw tab */}
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

              {/* Spacer to match the button area from draw tab */}
              <div 
                className="shrink-0 pt-3"
                style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
              >
                <div className="h-12" />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop / tablet layout
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex w-[calc(100%-2rem)] max-h-[92dvh] flex-col gap-3 overflow-y-auto p-6 sm:max-w-2xl md:max-w-3xl md:gap-4 lg:max-w-4xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 space-y-1.5 text-left">
          <DialogTitle className="text-lg">{currentSignature ? "Tu firma" : "Agregar firma"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList id="tour-signature-tabs" className="mb-0 grid w-full grid-cols-2">
            {currentSignature && (
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Vista previa
              </TabsTrigger>
            )}
            {!currentSignature && (
              <TabsTrigger value="draw" className="flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Dibujar
              </TabsTrigger>
            )}
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Subir imagen
            </TabsTrigger>
          </TabsList>

          {currentSignature && (
            <TabsContent value="preview" className="mt-3">
              <div className="flex h-[clamp(176px,calc(100dvh-20rem),300px)] items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-6 dark:bg-accent md:h-[clamp(200px,calc(100dvh-20rem),376px)] lg:h-[clamp(220px,calc(100dvh-20rem),432px)]">
                <img
                  src={currentSignature}
                  alt="Tu firma actual"
                  className="max-w-full max-h-48 object-contain"
                />
              </div>
              <div className="mt-3 flex shrink-0 gap-2 md:mt-4">
                <Button
                  variant="outline"
                  onClick={handleClearAndCreateNew}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Crear nueva
                </Button>
                <Button onClick={onClose} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Mantener
                </Button>
              </div>
            </TabsContent>
          )}

          <TabsContent value="draw" className="mt-3">
            <div
              id="tour-signature-canvas"
              className="relative h-[clamp(176px,calc(100dvh-20rem),300px)] w-full overflow-hidden rounded-lg border border-border bg-white dark:bg-accent md:h-[clamp(200px,calc(100dvh-20rem),376px)] lg:h-[clamp(220px,calc(100dvh-20rem),432px)]"
            >
              <div className="absolute bottom-16 left-8 right-8 border-b border-muted-foreground/15 pointer-events-none" />
              <div className="absolute bottom-[52px] left-8 text-[10px] text-muted-foreground/30 pointer-events-none select-none">
                Firma
              </div>
              <SignatureCanvas
                key={signaturePadKey}
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-full",
                  style: { width: "100%", height: "100%", touchAction: "none" },
                }}
                backgroundColor="transparent"
                penColor="#1e293b"
                minWidth={SIGNATURE_PAD_MIN_WIDTH}
                maxWidth={SIGNATURE_PAD_MAX_WIDTH}
              />
            </div>
            <div className="mt-3 flex shrink-0 gap-2 md:mt-4">
              <Button
                variant="outline"
                onClick={handleClearCanvas}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button id="tour-signature-save" onClick={handleSaveSignature} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Usar firma
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
              className="flex h-[clamp(176px,calc(100dvh-20rem),300px)] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-white transition-colors hover:bg-muted/20 dark:bg-accent md:h-[clamp(200px,calc(100dvh-20rem),376px)] lg:h-[clamp(220px,calc(100dvh-20rem),432px)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <span className="block text-sm font-medium text-foreground">Sube una imagen de tu firma</span>
                <span className="mt-1 block text-xs text-muted-foreground">PNG o JPG, máximo 5 MB</span>
              </div>
            </label>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};