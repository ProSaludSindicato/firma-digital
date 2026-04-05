import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pencil, Upload, X, Trash2, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { validateImageFile, validateImageDimensions } from "@/lib/validation";
import { compressImage, validateAndCompressImage } from "@/lib/imageCompression";
import { toast } from "@/hooks/use-toast";
import type { AuditEventType } from "@/hooks/useAuditTrail";

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
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hasStroke, setHasStroke] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const isMobile = useIsMobile();

  // Detect landscape orientation for mobile
  useEffect(() => {
    if (!isMobile) return;
    
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, [isMobile]);

  // Get device pixel ratio for high-DPI displays
  const getPixelRatio = () => {
    return typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  };

  const setFallbackCanvasSize = () => {
    if (typeof window === "undefined") return;
    const pixelRatio = getPixelRatio();

    // Conservative fallback that works even before the dialog finishes layout.
    // (We refine this immediately via ResizeObserver.)
    const displayWidth = Math.max(280, window.innerWidth - 32);
    const displayHeight = Math.max(240, window.innerHeight - 260);

    setCanvasSize({
      width: Math.floor(displayWidth * pixelRatio),
      height: Math.floor(displayHeight * pixelRatio),
    });
  };

  // Update canvas size when container resizes (critical on mobile where layout settles after open)
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== "draw") return;
    const el = containerRef.current;
    if (!el) {
      // Ensure we render a drawable canvas even if the ref isn't ready yet.
      setFallbackCanvasSize();
      return;
    }

    const updateSize = () => {
      const displayWidth = el.clientWidth;
      const displayHeight = el.clientHeight;

      // Avoid locking canvas into a 0x0 state during initial layout
      if (displayWidth < 8 || displayHeight < 8) {
        setFallbackCanvasSize();
        return;
      }

      const pixelRatio = getPixelRatio();
      setCanvasSize({
        width: Math.floor(displayWidth * pixelRatio),
        height: Math.floor(displayHeight * pixelRatio),
      });
    };

    // Run once ASAP after mount/layout
    const raf = requestAnimationFrame(updateSize);
    const timeout = window.setTimeout(updateSize, 50);

    // Keep in sync with actual container size
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSize) : null;
    ro?.observe(el);

    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      ro?.disconnect();
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, [isOpen, activeTab]);

  // Reset canvas when orientation changes to fix touch offset issues
  useEffect(() => {
    if (isOpen && activeTab === "draw" && signatureRef.current) {
      // Clear and reset the canvas when orientation changes
      signatureRef.current.clear();
      setHasStroke(false);
    }
  }, [isLandscape]);

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

  if (isMobile) {
    // Landscape layout: horizontal with tabs on the left side
    if (isLandscape) {
      return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="w-screen h-[100dvh] max-w-none max-h-none m-0 p-0 rounded-none border-none flex flex-row [&>button]:hidden">
            {/* Left sidebar with tabs and actions */}
            <div 
              className="flex flex-col justify-between bg-muted/50 border-r border-border shrink-0"
              style={{ 
                paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
                paddingLeft: 'max(0.5rem, env(safe-area-inset-left))'
              }}
            >
              {/* Top actions */}
              <div className="flex flex-col gap-1 p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearCanvas}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Vertical tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col justify-center">
                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-1">
                  {currentSignature && (
                    <TabsTrigger 
                      value="preview" 
                      className="flex items-center justify-center p-2 h-12 w-12 data-[state=active]:bg-background touch-manipulation"
                    >
                      <Eye className="w-5 h-5" />
                    </TabsTrigger>
                  )}
                  {!currentSignature && (
                    <TabsTrigger 
                      value="draw" 
                      className="flex items-center justify-center p-2 h-12 w-12 data-[state=active]:bg-background touch-manipulation"
                    >
                      <Pencil className="w-5 h-5" />
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="upload" 
                    className="flex items-center justify-center p-2 h-12 w-12 data-[state=active]:bg-background touch-manipulation"
                  >
                    <Upload className="w-5 h-5" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Bottom confirm button */}
              <div className="p-1">
                <Button 
                  onClick={handleSaveSignature} 
                  size="icon"
                  className="h-10 w-10"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Main content area */}
            <div 
              className="flex-1 flex flex-col min-w-0 p-2"
              style={{ 
                paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
                paddingRight: 'max(0.5rem, env(safe-area-inset-right))'
              }}
            >
              {activeTab === "preview" && currentSignature ? (
                <div className="flex-1 border-2 border-dashed border-border rounded-lg bg-accent flex flex-col items-center justify-center p-4">
                  <img
                    src={currentSignature}
                    alt="Tu firma actual"
                    className="max-w-full max-h-full object-contain"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAndCreateNew}
                    className="mt-4"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar y crear nueva
                  </Button>
                </div>
              ) : activeTab === "draw" ? (
                <div 
                  ref={containerRef}
                  className="flex-1 min-h-0 border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent relative"
                >
                  {!hasStroke && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                      <p className="text-muted-foreground text-sm">Firma aquí</p>
                    </div>
                  )}
                  <SignatureCanvas
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
                    minWidth={1.5}
                    maxWidth={3}
                  />
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-border rounded-lg text-center bg-accent flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="signature-modal-upload-landscape"
                  />
                  <label
                    htmlFor="signature-modal-upload-landscape"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Toca para subir
                    </span>
                  </label>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    // Portrait layout (original)
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
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <p className="text-muted-foreground text-sm">Firma aquí</p>
                  </div>
                )}

                {/* Use display dimensions for canvas, not scaled - let library handle touch properly */}
                <SignatureCanvas
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
                  minWidth={1.5}
                  maxWidth={3}
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

            <TabsContent value="upload" className="flex-1 flex flex-col m-0 p-3 overflow-hidden min-h-0 mt-0">
              {/* Upload area - same layout and position as draw tab */}
              <div 
                className="flex-1 min-h-0 border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent relative"
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="signature-modal-upload-mobile"
                />
                <label
                  htmlFor="signature-modal-upload-mobile"
                  className="cursor-pointer absolute inset-0 flex flex-col items-center justify-center"
                >
                  <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                  <span className="text-base text-muted-foreground text-center px-4">
                    Toca para subir una imagen de tu firma
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    PNG o JPG
                  </span>
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

  return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">{currentSignature ? "Tu firma" : "Agregar firma"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList id="tour-signature-tabs" className="grid w-full mb-4 grid-cols-2">
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
            <TabsContent value="preview" className="mt-0">
              <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-accent p-6 flex items-center justify-center min-h-[280px] md:min-h-[360px]">
                <img
                  src={currentSignature}
                  alt="Tu firma actual"
                  className="max-w-full max-h-48 object-contain"
                />
              </div>
              <div className="flex gap-2 mt-4">
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

          <TabsContent value="draw" className="mt-0">
            <div id="tour-signature-canvas" className="border border-border rounded-lg overflow-hidden bg-white dark:bg-accent h-[280px] md:h-[360px] relative">
              <div className="absolute bottom-16 left-8 right-8 border-b border-muted-foreground/15 pointer-events-none" />
              <div className="absolute bottom-[52px] left-8 text-[10px] text-muted-foreground/30 pointer-events-none select-none">
                Firma
              </div>
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-full",
                  style: { width: "100%", height: "100%", touchAction: "none" },
                }}
                backgroundColor="transparent"
                penColor="#1e293b"
              />
            </div>
            <div className="flex gap-2 mt-4">
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

          <TabsContent value="upload" className="mt-0">
            <div className="border border-border rounded-lg p-10 text-center bg-white dark:bg-accent hover:bg-muted/30 transition-colors">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageUpload}
                className="hidden"
                id="signature-modal-upload"
              />
              <label
                htmlFor="signature-modal-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    Sube una imagen de tu firma
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5 block">
                    PNG o JPG, máximo 5MB
                  </span>
                </div>
              </label>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};