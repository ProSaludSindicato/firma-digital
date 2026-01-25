import { FileSignature } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <FileSignature className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">SignaPDF</h1>
          <p className="text-sm text-muted-foreground">Firma tus documentos fácilmente</p>
        </div>
      </div>
    </header>
  );
};
