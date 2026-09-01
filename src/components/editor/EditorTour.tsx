import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ACTIONS,
  EVENTS,
  Joyride,
  STATUS,
  type EventData,
  type Step,
} from 'react-joyride';
import {
  MousePointerClick,
  PenLine,
  Send,
  Sparkles,
} from 'lucide-react';
import { TourTooltip } from '@/components/TourTooltip';

/** Tailwind `md` — ancho suficiente para anclar el globo a la derecha del visor. */
const VIEWER_WIDE_MIN_WIDTH_PX = 768;

const pdfAreaTourTitle = (
  <span className="flex items-center gap-2">
    <MousePointerClick className="w-4 h-4 text-primary flex-shrink-0" />
    Área del documento
  </span>
);

const lockedPdfAreaTourTitle = (
  <span className="flex items-center gap-2">
    <MousePointerClick className="w-4 h-4 text-primary flex-shrink-0" />
    Campos en el documento
  </span>
);

function createPdfAreaStep(
  layout: 'compact' | 'wide',
  lockedPlacement: boolean,
): Step {
  const title = lockedPlacement ? lockedPdfAreaTourTitle : pdfAreaTourTitle;
  const content = lockedPlacement
    ? 'Los campos pendientes aparecen directamente sobre el documento. Haz clic en cada uno para completarlo.'
    : 'Toca el documento donde quieras colocar el campo. Los campos pendientes se resaltan en ámbar; los completos, en verde.';

  if (layout === 'wide') {
    return {
      target: '#tour-pdf-area',
      placement: 'right-start',
      skipBeacon: true,
      skipScroll: true,
      floatingOptions: {
        flipOptions: false,
        shiftOptions: {
          ...(typeof document !== 'undefined'
            ? { boundary: document.documentElement, rootBoundary: 'viewport' as const }
            : {}),
          padding: 16,
          crossAxis: true,
        },
      },
      title,
      content,
    };
  }

  // En pantallas compactas el área del PDF ocupa casi todo el viewport; anclar
  // el globo al contenedor grande con `bottom`/`top` lo empuja fuera de pantalla.
  return {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    title,
    content,
  };
}

const welcomeStep: Step = {
  target: 'body',
  placement: 'center',
  skipBeacon: true,
  title: (
    <span className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
      Diligenciamiento de documentos
    </span>
  ),
  content: (
    <div className="space-y-2">
      <p>
        Aquí podrás colocar y completar campos en un documento PDF: firma,
        texto, números, fechas y casillas.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Este breve tour te muestra lo esencial en unos pocos pasos.
      </p>
    </div>
  ),
};

const lockedWelcomeStep: Step = {
  target: 'body',
  placement: 'center',
  skipBeacon: true,
  title: (
    <span className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
      Completa el documento
    </span>
  ),
  content: (
    <p>
      Este documento ya tiene campos definidos. Solo necesitas completarlos
      directamente sobre el PDF.
    </p>
  ),
};

const toolbarStep: Step = {
  target: '#tour-editor-toolbar',
  placement: 'top',
  skipBeacon: true,
  skipScroll: true,
  title: (
    <span className="flex items-center gap-2">
      <PenLine className="w-4 h-4 text-primary flex-shrink-0" />
      Barra de herramientas
    </span>
  ),
  content:
    'Selecciona el tipo de campo que necesitas: firma, texto, número, fecha o casilla. Luego tócalo sobre el documento.',
};

const finishStep: Step = {
  target: '#tour-header-send',
  placement: 'bottom',
  skipBeacon: true,
  skipScroll: true,
  title: (
    <span className="flex items-center gap-2">
      <Send className="w-4 h-4 text-primary flex-shrink-0" />
      Finalizar
    </span>
  ),
  content:
    'Cuando completes todos los campos obligatorios, podrás descargar o enviar el documento desde este botón.',
};

const embedFinishStep: Step = {
  target: 'body',
  placement: 'center',
  skipBeacon: true,
  title: (
    <span className="flex items-center gap-2">
      <Send className="w-4 h-4 text-primary flex-shrink-0" />
      Enviar documento
    </span>
  ),
  content:
    'Cuando completes todos los campos obligatorios, usa el botón «Enviar documento» en la barra superior de esta ventana.',
};

function createEditorSteps(
  lockedPlacement: boolean,
  layout: 'compact' | 'wide',
  embedMode = false,
): Step[] {
  const pdfAreaStep = createPdfAreaStep(layout, lockedPlacement);
  const finish = embedMode ? embedFinishStep : finishStep;

  if (lockedPlacement) {
    return [lockedWelcomeStep, pdfAreaStep, finish];
  }
  return [welcomeStep, toolbarStep, pdfAreaStep, finish];
}

interface EditorTourProps {
  run: boolean;
  stepIndex: number;
  lockedPlacement?: boolean;
  embedMode?: boolean;
  onStepChange: (idx: number) => void;
  onEnd: () => void;
}

export function EditorTour({
  run,
  stepIndex,
  lockedPlacement = false,
  embedMode = false,
  onStepChange,
  onEnd,
}: EditorTourProps) {
  const [viewerLayout, setViewerLayout] = useState<'compact' | 'wide'>(() =>
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${VIEWER_WIDE_MIN_WIDTH_PX}px)`).matches
      ? 'wide'
      : 'compact',
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${VIEWER_WIDE_MIN_WIDTH_PX}px)`);
    const sync = () => setViewerLayout(mq.matches ? 'wide' : 'compact');
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const steps = useMemo(
    () => createEditorSteps(lockedPlacement, viewerLayout, embedMode),
    [lockedPlacement, viewerLayout, embedMode],
  );

  const handleCallback = useCallback(
    (data: EventData) => {
      const { type, index, status, action } = data;

      if (
        type === EVENTS.TOUR_END ||
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED
      ) {
        onEnd();
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const isBack = action === ACTIONS.PREV;
        onStepChange(isBack ? Math.max(0, index - 1) : index + 1);
      }
    },
    [onEnd, onStepChange],
  );

  if (steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep={false}
      tooltipComponent={TourTooltip}
      onEvent={handleCallback}
      options={{
        showProgress: false,
        scrollOffset: 80,
        buttons: ['back', 'close', 'primary', 'skip'],
        spotlightRadius: 8,
        zIndex: 9999,
        arrowColor: 'hsl(var(--background))',
        overlayColor: 'rgba(0, 0, 0, 0.62)',
        disableFocusTrap: true,
      }}
      styles={{
        overlay: {
          mixBlendMode: 'normal',
        },
      }}
    />
  );
}
