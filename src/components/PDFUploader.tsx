import { Upload, FileText, AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { validatePDFFile, validatePDFIntegrity } from "@/lib/validation";
import { toast } from "@/hooks/use-toast";

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
  onError?: (error: string) => void;
}

export const PDFUploader = ({ onFileSelect, fileName, onError }: PDFUploaderProps) => {
  const [isValidating, setIsValidating] = useState(false);

  const handleFileValidation = useCallback(
    async (file: File | null) => {
      if (!file) return;

      setIsValidating(true);

      try {
        // Basic validation
        const validation = validatePDFFile(file);
        if (!validation.valid) {
          toast({
            title: "Error de validación",
            description: validation.error,
            variant: "destructive",
          });
          onError?.(validation.error || "Error desconocido");
          return;
        }

        // Integrity check (async)
        const integrityCheck = await validatePDFIntegrity(file);
        if (!integrityCheck.valid) {
          toast({
            title: "Error de validación",
            description: integrityCheck.error,
            variant: "destructive",
          });
          onError?.(integrityCheck.error || "Error desconocido");
          return;
        }

        // File is valid, proceed
        onFileSelect(file);
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Error al validar el archivo PDF";
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        onError?.(errorMessage);
      } finally {
        setIsValidating(false);
      }
    },
    [onFileSelect, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileValidation(file);
      }
    },
    [handleFileValidation]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileValidation(file);
      }
      // Reset input to allow selecting the same file again
      e.target.value = '';
    },
    [handleFileValidation]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`relative flex flex-col items-center justify-center w-full mx-auto p-8 sm:p-10 md:p-14 border-2 border-dashed rounded-xl bg-card/80 transition-all duration-200 group ${
        isValidating
          ? "opacity-50 cursor-wait border-muted"
          : "hover:border-primary/50 hover:bg-card cursor-pointer border-border"
      }`}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="hidden"
        id="pdf-upload"
      />
      <label
        htmlFor="pdf-upload"
        className="flex flex-col items-center cursor-pointer w-full"
      >
        {fileName ? (
          <>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-foreground mb-1">{fileName}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Haz clic para cambiar el archivo
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/12 transition-colors">
              <Upload className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-primary/70 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
              Arrastra tu PDF aquí
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground/50">
              PDF, máximo 10MB
            </p>
            {isValidating && (
              <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary/5 border border-primary/15">
                <AlertCircle className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Validando...</span>
              </div>
            )}
          </>
        )}
      </label>
    </div>
  );
};
