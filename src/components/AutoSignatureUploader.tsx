import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, Image as ImageIcon, X, Download, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validatePDFFile, validatePDFIntegrity, validateImageFile } from "@/lib/validation";
import { validateAndCompressImage } from "@/lib/imageCompression";
import { toast } from "@/hooks/use-toast";
import { AutoSignatureConfig } from "@/hooks/useAutoPDFSigner";
import { PDFDocument } from "pdf-lib";
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
  onAISearch?: (enabled: boolean, apiKey: string) => void;
}

export const AutoSignatureUploader = ({
  onPDFSelect,
  onSignatureImageSelect,
  onConfigChange,
  pdfFile,
  signatureImage,
  signatureConfig,
  onTotalPagesChange,
  onAISearch,
}: AutoSignatureUploaderProps) => {
  const [isValidatingPDF, setIsValidatingPDF] = useState(false);
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiSearchPage, setAiSearchPage] = useState<number | null>(AI_SEARCH_CONFIG.defaultSearchPage);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [localConfig, setLocalConfig] = useState<AutoSignatureConfig>(
    signatureConfig || DEFAULT_AUTO_SIGN_CONFIG
  );

  // Sincronizar config local con prop cuando cambia
  useEffect(() => {
    if (signatureConfig) {
      setLocalConfig(signatureConfig);
    }
  }, [signatureConfig]);

  // Cargar información del PDF cuando se selecciona
  useEffect(() => {
    const loadPDFInfo = async () => {
      if (!pdfFile) return;

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const pageCount = pages.length;
        setTotalPages(pageCount);
        onTotalPagesChange(pageCount);

        // Si no hay configuración previa, establecer valores por defecto basados en la primera página
        if (!signatureConfig && pages.length > 0) {
          const firstPage = pages[0];
          const { width, height } = firstPage.getSize();
          const newConfig = {
            ...DEFAULT_AUTO_SIGN_CONFIG,
            // Ajustar posición X e Y como porcentaje de la página si es necesario
            x: width * 0.1 > DEFAULT_AUTO_SIGN_CONFIG.x ? width * 0.1 : DEFAULT_AUTO_SIGN_CONFIG.x,
            y: height * 0.1 > DEFAULT_AUTO_SIGN_CONFIG.y ? height * 0.1 : DEFAULT_AUTO_SIGN_CONFIG.y,
          };
          setLocalConfig(newConfig);
          onConfigChange(newConfig);
        }
      } catch (error) {
        console.error("Error al cargar información del PDF:", error);
      }
    };

    loadPDFInfo();
  }, [pdfFile, onTotalPagesChange, signatureConfig]);

  // Búsqueda con IA cuando se habilita y hay un PDF
  const handleAISearch = useCallback(async () => {
    if (!pdfFile || isSearchingAI) return;

    setIsSearchingAI(true);
    try {
      const provider = createSignatureLocationProvider();
      const textLocation = await provider.findTextInPDF({
        pdfFile,
        searchText: AI_SEARCH_CONFIG.searchText,
        pageNumber: aiSearchPage || undefined,
      });

      if (textLocation) {
        const signaturePos = calculateSignaturePosition(
          textLocation,
          AI_SEARCH_CONFIG.offsetX,
          AI_SEARCH_CONFIG.offsetY,
        );

        const newConfig: AutoSignatureConfig = {
          page: signaturePos.page,
          x: signaturePos.x,
          y: signaturePos.y,
          width: localConfig.width,
          height: localConfig.height,
        };

        setLocalConfig(newConfig);
        onConfigChange(newConfig);

        toast({
          title: "✓ Texto encontrado",
          description: `Firma ubicada automáticamente cerca de "${AI_SEARCH_CONFIG.searchText}" en la página ${signaturePos.page}`,
        });
      } else {
        toast({
          title: "Texto no encontrado",
          description: `No se encontró el texto "${AI_SEARCH_CONFIG.searchText}" en el PDF. Usa posición manual.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al buscar texto con IA";
      toast({
        title: "Error en búsqueda con IA",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearchingAI(false);
    }
  }, [pdfFile, aiSearchPage, localConfig.width, localConfig.height, onConfigChange, isSearchingAI]);

  // Nota: La búsqueda se ejecuta manualmente cuando el usuario hace clic en el botón
  // No se ejecuta automáticamente para dar más control al usuario

  const handlePDFValidation = useCallback(
    async (file: File | null) => {
      if (!file) return;

      setIsValidatingPDF(true);

      try {
        const validation = validatePDFFile(file);
        if (!validation.valid) {
          toast({
            title: "Error de validación",
            description: validation.error,
            variant: "destructive",
          });
          return;
        }

        const integrityCheck = await validatePDFIntegrity(file);
        if (!integrityCheck.valid) {
          toast({
            title: "Error de validación",
            description: integrityCheck.error,
            variant: "destructive",
          });
          return;
        }

        onPDFSelect(file);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al validar el archivo PDF";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsValidatingPDF(false);
      }
    },
    [onPDFSelect]
  );

  const handlePDFDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handlePDFValidation(file);
      }
    },
    [handlePDFValidation]
  );

  const handlePDFInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handlePDFValidation(file);
      }
      e.target.value = "";
    },
    [handlePDFValidation]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsValidatingImage(true);

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

        // Detectar si es PNG para preservar la transparencia
        const isPNG = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        
        const compressedImage = await validateAndCompressImage(file, {
          maxWidth: AUTO_SIGN_IMAGE_OPTIONS.maxWidth,
          maxHeight: AUTO_SIGN_IMAGE_OPTIONS.maxHeight,
          quality: AUTO_SIGN_IMAGE_OPTIONS.quality,
          format: isPNG ? "png" : "jpeg", // Preservar PNG para mantener transparencia
        });

        onSignatureImageSelect(compressedImage);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error al procesar la imagen";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsValidatingImage(false);
        e.target.value = "";
      }
    },
    [onSignatureImageSelect]
  );

  const handleConfigUpdate = useCallback(
    (field: keyof AutoSignatureConfig, value: number) => {
      const newConfig = { ...localConfig, [field]: value };
      setLocalConfig(newConfig);
      onConfigChange(newConfig);
    },
    [localConfig, onConfigChange]
  );

  return (
    <div className="space-y-6">
      {/* PDF Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documento PDF
          </CardTitle>
          <CardDescription>Selecciona el documento PDF al que se agregará la firma</CardDescription>
        </CardHeader>
        <CardContent>
          {pdfFile ? (
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
          ) : (
            <div
              onDrop={handlePDFDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg bg-card transition-all ${
                isValidatingPDF
                  ? "opacity-50 cursor-wait border-muted"
                  : "hover:border-primary cursor-pointer border-primary/30"
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
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-semibold mb-1">Arrastra tu PDF aquí</p>
                <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF (máx. 10MB)</p>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Imagen de Firma
          </CardTitle>
          <CardDescription>Selecciona la imagen de la firma a insertar</CardDescription>
        </CardHeader>
        <CardContent>
          {signatureImage ? (
            <div className="space-y-4">
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
                    // Reset signature image selection
                    const input = document.getElementById("auto-signature-upload") as HTMLInputElement;
                    if (input) input.value = "";
                    // Clear the signature by passing empty string
                    onSignatureImageSelect("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg bg-card">
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
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-semibold mb-1">Sube la imagen de la firma</p>
                <p className="text-sm text-muted-foreground">PNG o JPG (máx. 5MB)</p>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Search Configuration */}
      {pdfFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Búsqueda Automática con IA
            </CardTitle>
            <CardDescription>
              Usa IA para encontrar automáticamente el texto "{AI_SEARCH_CONFIG.searchText}" y ubicar la firma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-ai">Habilitar búsqueda con IA</Label>
                <p className="text-sm text-muted-foreground">
                  La IA buscará el texto y ajustará la posición automáticamente
                </p>
              </div>
              <Switch
                id="use-ai"
                checked={useAI}
                onCheckedChange={setUseAI}
                disabled={isSearchingAI}
              />
            </div>
            {useAI && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span>💡</span>
                  <p>
                    La IA analizará el documento para encontrar el texto <strong>"{AI_SEARCH_CONFIG.searchText}"</strong> y ubicar la firma automáticamente. No requiere configuración adicional.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-search-page">
                    📄 Página donde buscar (opcional)
                  </Label>
                  <Input
                    id="ai-search-page"
                    type="number"
                    min="1"
                    max={totalPages || undefined}
                    placeholder={`Dejar vacío para buscar en todo el documento (1-${totalPages || "?"})`}
                    value={aiSearchPage || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAiSearchPage(val ? parseInt(val) : null);
                    }}
                    disabled={isSearchingAI}
                  />
                  <p className="text-xs text-muted-foreground">
                    Especifica la página para reducir el tiempo de búsqueda.
                  </p>
                </div>

                {isSearchingAI && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-background rounded border">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando "{AI_SEARCH_CONFIG.searchText}" en el PDF{aiSearchPage ? ` (página ${aiSearchPage})` : ""}...</span>
                  </div>
                )}

                {useAI && !isSearchingAI && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleAISearch}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Buscar texto y ubicar firma
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Posición</CardTitle>
          <CardDescription>
            {useAI
              ? "La posición se ajustará automáticamente cuando se encuentre el texto. Puedes modificarla manualmente si es necesario."
              : "Especifica en qué página y posición se insertará la firma (valores en puntos PDF)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="page">Página</Label>
              <Input
                id="page"
                type="number"
                min="1"
                value={localConfig.page}
                onChange={(e) => handleConfigUpdate("page", parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">Número de página (empezando en 1)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="x">Posición X</Label>
              <Input
                id="x"
                type="number"
                min="0"
                value={localConfig.x}
                onChange={(e) => handleConfigUpdate("x", parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Distancia desde la izquierda (puntos)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="y">Posición Y</Label>
              <Input
                id="y"
                type="number"
                min="0"
                value={localConfig.y}
                onChange={(e) => handleConfigUpdate("y", parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Distancia desde abajo (puntos)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Ancho</Label>
              <Input
                id="width"
                type="number"
                min="1"
                value={localConfig.width}
                onChange={(e) => handleConfigUpdate("width", parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">Ancho de la firma (puntos)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Alto</Label>
              <Input
                id="height"
                type="number"
                min="1"
                value={localConfig.height}
                onChange={(e) => handleConfigUpdate("height", parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">Alto de la firma (puntos)</p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> El sistema de coordenadas PDF tiene el origen (0,0) en la esquina
              inferior izquierda. X aumenta hacia la derecha, Y aumenta hacia arriba.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

