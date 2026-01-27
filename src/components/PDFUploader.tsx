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
      className={`relative flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-8 sm:p-10 md:p-12 border-2 border-dashed rounded-2xl bg-card transition-all duration-300 group shadow-xl hover:shadow-2xl ${
        isValidating 
          ? "opacity-50 cursor-wait border-muted" 
          : "hover:border-primary hover:bg-primary/5 cursor-pointer border-primary/30"
      }`}
    >
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
      
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
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-md">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-foreground mb-1">{fileName}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Haz clic para cambiar el archivo
            </p>
          </>
        ) : (
          <>
            <div className="relative mb-5 sm:mb-6">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl group-hover:bg-primary/40 transition-colors duration-300" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 border-2 border-primary/20">
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
              Arrastra tu PDF aquí
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mb-1">
              o haz clic para seleccionar un archivo
            </p>
            <p className="text-xs text-muted-foreground/60">
              PDF (máx. 10MB)
            </p>
            {isValidating && (
              <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <AlertCircle className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Validando archivo...</span>
              </div>
            )}
          </>
        )}
      </label>
    </div>
  );
};
