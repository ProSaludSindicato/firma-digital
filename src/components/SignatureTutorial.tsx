import { useState, useCallback } from "react";
import { MousePointerClick, PenLine, ChevronRight, Send } from "lucide-react";
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
    icon: <MousePointerClick className="w-8 h-8 text-primary" />,
    title: "Haz clic en el documento",
    description: "Toca o haz clic en el lugar del documento donde quieres colocar tu firma.",
  },
  {
    icon: <PenLine className="w-8 h-8 text-primary" />,
    title: "Dibuja o sube tu firma",
    description: "Toca el marcador para abrir el panel donde puedes dibujar tu firma o subir una imagen.",
  },
  {
    icon: <Send className="w-8 h-8 text-primary" />,
    title: "Envía tu documento",
    description: "Revisa la posición de tu firma y presiona 'Enviar' cuando estés listo.",
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

export const useSignatureTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  const checkAndShowTutorial = useCallback(() => {
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
