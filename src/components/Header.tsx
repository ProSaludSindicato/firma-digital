import { Info } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-secondary px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary-foreground/20 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-secondary-foreground" />
        </div>
        <p className="text-sm md:text-base text-secondary-foreground font-medium">
          Encontrará el espacio de firma digital en la segunda página del documento, haga clic para agregar su firma digital en el espacio demarcado.
        </p>
      </div>
    </header>
  );
};
