import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pencil, Upload, X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureCreate: (signature: string) => void;
}

export const SignatureModal = ({
  isOpen,
  onClose,
  onSignatureCreate,
}: SignatureModalProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("draw");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isMobile = useIsMobile();

  // Get device pixel ratio for high-DPI displays
  const getPixelRatio = () => {
    return typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  };

  // Update canvas size when container resizes or modal opens
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pixelRatio = getPixelRatio();
        // Store display size and actual canvas size (scaled for retina)
        setCanvasSize({ 
          width: rect.width * pixelRatio, 
          height: rect.height * pixelRatio 
        });
      }
    };

    // Initial size
    setTimeout(updateSize, 50);

    // Listen for resize
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateSize, 100);
    });

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, [isOpen]);

  // Get high-quality signature with proper trimming
  const handleSaveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const canvas = signatureRef.current.getCanvas();
      
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
        
        const dataUrl = trimmedCanvas.toDataURL("image/png", 1.0);
        onSignatureCreate(dataUrl);
      } else {
        const dataUrl = signatureRef.current.toDataURL("image/png");
        onSignatureCreate(dataUrl);
      }
      
      onClose();
    }
  };

  const handleClearCanvas = () => {
    signatureRef.current?.clear();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onSignatureCreate(result);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Full-screen mobile modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-none flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">Dibuja tu firma</h2>
            <Button variant="ghost" size="icon" onClick={handleClearCanvas}>
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs for mobile */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="draw" className="flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Dibujar
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Subir imagen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="flex-1 flex flex-col m-0 p-4 overflow-hidden">
              {/* Canvas container - takes all available space */}
              <div 
                ref={containerRef}
                className="flex-1 border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent relative"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <p className="text-muted-foreground text-sm">Firma aquí</p>
                </div>
              {canvasSize.width > 0 && (() => {
                const pixelRatio = getPixelRatio();
                const displayWidth = canvasSize.width / pixelRatio;
                const displayHeight = canvasSize.height / pixelRatio;
                
                return (
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: canvasSize.width,
                      height: canvasSize.height,
                      style: { 
                        width: `${displayWidth}px`, 
                        height: `${displayHeight}px`,
                      },
                    }}
                    backgroundColor="transparent"
                    penColor="#1e293b"
                    minWidth={1.5 * pixelRatio}
                    maxWidth={3 * pixelRatio}
                  />
                );
              })()}
              </div>

              {/* Large confirm button */}
              <Button 
                onClick={handleSaveSignature} 
                size="lg" 
                className="w-full mt-4 h-14 text-lg"
              >
                <Check className="w-5 h-5 mr-2" />
                Usar esta firma
              </Button>
            </TabsContent>

            <TabsContent value="upload" className="flex-1 m-0 p-4">
              <div className="h-full border-2 border-dashed border-border rounded-lg p-8 text-center bg-accent flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="signature-modal-upload-mobile"
                />
                <label
                  htmlFor="signature-modal-upload-mobile"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <span className="text-base text-muted-foreground">
                    Toca para subir una imagen de tu firma
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">
                    PNG, JPG o GIF
                  </span>
                </label>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop modal (original behavior)
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agregar tu firma</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Dibujar
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Subir imagen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-0">
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-accent">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-56 md:h-64",
                  style: { width: "100%", height: "100%" },
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
                Limpiar
              </Button>
              <Button onClick={handleSaveSignature} className="flex-1">
                Usar firma
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-accent">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="signature-modal-upload"
              />
              <label
                htmlFor="signature-modal-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Haz clic para subir una imagen de tu firma
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  PNG, JPG o GIF
                </span>
              </label>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};