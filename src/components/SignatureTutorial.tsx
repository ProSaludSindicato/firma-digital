import { useState, useEffect } from "react";
import { X, MousePointerClick, Move, PenLine, FileSignature, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
];

const TUTORIAL_STORAGE_KEY = "signature-tutorial-shown";

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
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    onClose();
  };

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Cómo firmar tu documento</DialogTitle>
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

// Hook to manage tutorial visibility
export const useSignatureTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  const checkAndShowTutorial = () => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  // Reset tutorial (useful for testing)
  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  };

  return {
    showTutorial,
    checkAndShowTutorial,
    closeTutorial,
    resetTutorial,
  };
};
