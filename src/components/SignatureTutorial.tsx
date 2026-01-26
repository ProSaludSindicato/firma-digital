import { useState, useCallback } from "react";
import { MousePointerClick, Move, PenLine, FileSignature, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: <FileSignature className="w-8 h-8 text-primary" />,
    title: "Navega al área de firma",
    description: "Usa el botón 'Ir a firmar' o la navegación de páginas para ir a la página donde debes firmar.",
  },
  {
    icon: <MousePointerClick className="w-8 h-8 text-primary" />,
    title: "Toca donde deseas firmar",
    description: "Haz clic o toca en el documento donde quieres colocar tu firma. Aparecerá un marcador.",
  },
  {
    icon: <Move className="w-8 h-8 text-primary" />,
    title: "Ajusta la posición",
    description: "Puedes arrastrar el marcador para moverlo a la ubicación exacta donde deseas tu firma.",
  },
  {
    icon: <PenLine className="w-8 h-8 text-primary" />,
    title: "Crea tu firma",
    description: "Toca el marcador para abrir el panel de firma. Puedes dibujar tu firma o subir una imagen.",
  },
  {
    icon: <Send className="w-8 h-8 text-primary" />,
    title: "Revisa y envía",
    description: "Una vez colocada tu firma, revisa el documento y presiona 'Finalizar y Enviar Convenio'.",
  },
];

interface SignatureTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignatureTutorial = ({ isOpen, onClose }: SignatureTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onClose();
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onClose();
  };

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Cómo firmar tu documento</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Sigue estos pasos para completar tu firma
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 px-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary w-6"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {step.icon}
            </div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {step.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Omitir
          </Button>
          <Button onClick={handleNext} className="gap-1">
            {isLastStep ? "¡Entendido!" : "Siguiente"}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to manage tutorial visibility - shows every time PDF loads
export const useSignatureTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  const checkAndShowTutorial = useCallback(() => {
    // Always show tutorial when PDF loads
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  return {
    showTutorial,
    checkAndShowTutorial,
    closeTutorial,
  };
};
