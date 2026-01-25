import { Upload, FileText } from "lucide-react";
import { useCallback } from "react";

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
}

export const PDFUploader = ({ onFileSelect, fileName }: PDFUploaderProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-12 border-2 border-dashed border-border rounded-lg bg-card hover:border-primary/50 transition-colors cursor-pointer group"
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
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">{fileName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Haz clic para cambiar el archivo
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">
              Arrastra tu PDF aquí
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              o haz clic para seleccionar un archivo
            </p>
          </>
        )}
      </label>
    </div>
  );
};
