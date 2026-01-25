import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pencil, Upload, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SignaturePanelProps {
  onSignatureCreate: (signature: string) => void;
  onClearSignature: () => void;
  hasSignature: boolean;
}

export const SignaturePanel = ({
  onSignatureCreate,
  onClearSignature,
  hasSignature,
}: SignaturePanelProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [activeTab, setActiveTab] = useState("draw");

  const handleSaveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const dataUrl = signatureRef.current.toDataURL("image/png");
      onSignatureCreate(dataUrl);
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
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Tu Firma</h3>
      
      {hasSignature ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <Check className="w-5 h-5" />
            <span className="font-medium">Firma agregada</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Arrastra la firma en el documento para reposicionarla
          </p>
          <Button
            variant="outline"
            onClick={onClearSignature}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar firma
          </Button>
        </div>
      ) : (
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
                  className: "w-full h-48",
                  style: { width: "100%", height: "192px" },
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
                id="signature-upload"
              />
              <label
                htmlFor="signature-upload"
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
      )}
    </div>
  );
};
