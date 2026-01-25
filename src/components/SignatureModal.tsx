import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("draw");

  const handleSaveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const dataUrl = signatureRef.current.toDataURL("image/png");
      onSignatureCreate(dataUrl);
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
