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
  FileText,
  ZoomIn,
  Layers,
  PenLine,
  Send,
  Pencil,
  MousePointerClick,
  Check,
  Sparkles,
  Move,
  Maximize2,
} from 'lucide-react';
import { TourTooltip } from '@/components/TourTooltip';
import type { TourPhase } from '@/hooks/useTour';

/* ─── Step Definitions ────────────────────────────────────────────────────── */

const welcomeSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    title: (
      <span className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
        Bienvenido a Firma Digital
      </span>
    ),
    content: (
      <div className="space-y-2">
        <p>
          Aquí podrás firmar documentos PDF de forma rápida y segura, directo
          desde tu navegador.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Este tour te guiará por el proceso completo en 3 fases.
        </p>
      </div>
    ),
  },
  {
    target: '#tour-upload-area',
    placement: 'top',
    skipBeacon: true,
    title: (
      <span className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        Sube tu documento PDF
      </span>
    ),
    content:
      'Arrastra tu archivo PDF aquí o haz clic para buscarlo en tu dispositivo. Solo se aceptan archivos en formato PDF.',
  },
  {
    target: '#tour-steps-indicator',
    placement: 'top',
    skipBeacon: true,
    title: (
      <span className="flex items-center gap-2">
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
        3 pasos, proceso completo
      </span>
    ),
    content: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">1</span>
          <span>Sube tu PDF</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">2</span>
          <span>Agrega tu firma en el documento</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">3</span>
          <span>Envía y descarga el PDF firmado</span>
        </div>
      </div>
    ),
  },
];

/** Tailwind `md` — ancho suficiente para anclar el globo a la derecha del visor. */
const VIEWER_WIDE_MIN_WIDTH_PX = 768;

const pdfAreaTourTitle = (
  <span className="flex items-center gap-2">
    <MousePointerClick className="w-4 h-4 text-primary flex-shrink-0" />
    Área del documento
  </span>
);

const pdfAreaTourContent = (
  <div className="space-y-1.5">
    <p>
      Esta es el área principal de visualización. Cuando estés en la{' '}
      <strong>página de firma</strong>, haz clic donde quieras colocar tu firma.
    </p>
    <p className="text-xs text-muted-foreground/70">
      Un marcador aparecerá en el lugar seleccionado.
    </p>
  </div>
);

function createViewerSteps(layout: 'compact' | 'wide'): Step[] {
  const pdfAreaStep: Step =
    layout === 'wide'
      ? {
          target: '#tour-pdf-area',
          placement: 'right-start',
          skipBeacon: true,
          skipScroll: true,
          // No flip to `left`: junto al panel de miniaturas suele quedar espacio insuficiente y el
          // globo termina cortado fuera del viewport. Sin flip, el globo permanece a la derecha del
          // visor; `shift` lo empuja para que quepa en pantalla (aunque invada el área resaltada).
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
          title: pdfAreaTourTitle,
          content: pdfAreaTourContent,
        }
      : {
          target: '#tour-pdf-area',
          placement: 'bottom',
          skipBeacon: true,
          skipScroll: true,
          title: pdfAreaTourTitle,
          content: pdfAreaTourContent,
        };

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: (
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          ¡PDF cargado!
        </span>
      ),
      content:
        'Tu documento está listo. El visor te permite navegar, hacer zoom y colocar tu firma en la página correcta.',
    },
    {
      target: '#tour-pdf-toolbar-zoom',
      placement: 'bottom',
      skipBeacon: true,
      skipScroll: true,
      title: (
        <span className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-primary flex-shrink-0" />
          Controles de zoom
        </span>
      ),
      content: (
        <div className="space-y-1.5">
          <p>Acerca o aleja el documento para leerlo con comodidad.</p>
            {/*<p className="text-xs text-muted-foreground/70">
            Atajos de teclado: <kbd className="px-1 bg-muted rounded text-[10px]">+</kbd> para acercar,{' '}
            <kbd className="px-1 bg-muted rounded text-[10px]">-</kbd> para alejar.
            </p>*/}
        </div>
      ),
    },
    {
      target: '#tour-pdf-toolbar-pages',
      placement: 'bottom',
      skipBeacon: true,
      skipScroll: true,
      title: (
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary flex-shrink-0" />
          Navegación de páginas
        </span>
      ),
      content: (
        <div className="space-y-1.5">
          <p>
            Navega entre las páginas del documento. La <strong>página de firma</strong> aparece
            resaltada en azul.
          </p>
            {/*<p className="text-xs text-muted-foreground/70">
            También puedes usar{' '}
            <kbd className="px-1 bg-muted rounded text-[10px]">←</kbd>{' '}
            <kbd className="px-1 bg-muted rounded text-[10px]">→</kbd> en el teclado.
            </p> */}
        </div>
      ),
    },
  ];

  // The thumbnails panel uses `hidden md:block` so it is invisible on mobile.
  // Including it on compact layout causes Joyride to show only a dark overlay
  // with no tooltip, blocking all interaction. Skip it on mobile entirely.
  if (layout === 'wide') {
    steps.push({
      target: '#tour-pdf-thumbnails',
      placement: 'right',
      skipBeacon: true,
      title: (
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary flex-shrink-0" />
          Panel de miniaturas
        </span>
      ),
      content:
        'Vista rápida de todas las páginas. Haz clic en cualquier miniatura para saltar directamente a esa página.',
    });
  }

  steps.push(pdfAreaStep);
  /* Paso del pie "Ir al área de firma" desactivado: el botón se ocultó para evitar confusión
     cuando el usuario ya está en la página de firma. La colocación se hace tocando el PDF. */

  return steps;
}

/* ─── modal phase — appears when the signature modal opens ─────────────────── */
// Intentionally uses `target: 'body' / placement: 'center'` to avoid z-index
// and event-propagation conflicts with the Radix UI Dialog. Spotlighting
// elements inside a portal-rendered dialog causes Radix to fire
// onPointerDownOutside (closing the dialog) whenever the Joyride tooltip is
// clicked. Body-centered steps sidestep this entirely.

const modalSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    title: (
      <span className="flex items-center gap-2">
        <PenLine className="w-4 h-4 text-primary flex-shrink-0" />
        Crea y guarda tu firma
      </span>
    ),
    content: (
      <div className="space-y-2">
        <p className="text-xs leading-relaxed">
          Elige <strong>Dibujar</strong> (traza con ratón o dedo) o{' '}
          <strong>Subir imagen</strong> (PNG o JPG). En el lienzo puedes borrar y volver a
          dibujar las veces que necesites.
        </p>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Cuando quedes satisfecho, pulsa <strong>&quot;Usar firma&quot;</strong> para
          insertarla en el documento.
        </p>
      </div>
    ),
  },
];

/* ─── placed phase — appears after the signature is placed on the document ── */

const placedSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    title: (
      <span className="flex items-center gap-2">
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
        ¡Firma insertada!
      </span>
    ),
    content: (
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-xs">
          <Move className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <p>
            <strong>Arrastra</strong> desde el recuadro de la firma para moverla (el cursor en
            forma de cruz indica que puedes desplazarla).
          </p>
        </div>
        <div className="flex items-start gap-2 text-xs">
          <Maximize2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5 rotate-90" />
          <p>
            Para el tamaño, usa el círculo de la <strong>esquina inferior derecha</strong>.
          </p>
        </div>
        <div className="flex items-start gap-2 text-xs">
          <Pencil className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
          <p>
            Para cambiar o volver a crear la firma, pulsa el icono del <strong>lápiz</strong>{' '}
            (arriba a la izquierda del recuadro).
          </p>
        </div>
      </div>
    ),
  },
  {
    target: '#tour-footer-action',
    placement: 'top',
    skipBeacon: true,
    skipScroll: true,
    title: (
      <span className="flex items-center gap-2">
        <Send className="w-4 h-4 text-primary flex-shrink-0" />
        Enviar el documento firmado
      </span>
    ),
    content: (
      <div className="space-y-1.5">
        <p>
          Cuando estés conforme con la posición de tu firma, pulsa{' '}
          <strong>"Enviar documento firmado"</strong>.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Se generará y descargará automáticamente el PDF con tu firma incrustada.
        </p>
      </div>
    ),
  },
];

/* ─── Phase → Steps map (viewer se arma en el componente según ancho de ventana) ─ */

const STATIC_PHASE_STEPS: Record<Exclude<TourPhase, 'none' | 'viewer'>, Step[]> = {
  welcome: welcomeSteps,
  modal: modalSteps,
  placed: placedSteps,
};

/* ─── AppTour component ───────────────────────────────────────────────────── */

interface AppTourProps {
  phase: TourPhase;
  run: boolean;
  stepIndex: number;
  onStepChange: (idx: number) => void;
  onPhaseEnd: () => void;
}

export const AppTour = ({
  phase,
  run,
  stepIndex,
  onStepChange,
  onPhaseEnd,
}: AppTourProps) => {
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

  const steps = useMemo(() => {
    if (phase === 'none') return [];
    if (phase === 'viewer') return createViewerSteps(viewerLayout);
    return STATIC_PHASE_STEPS[phase];
  }, [phase, viewerLayout]);

  const handleCallback = useCallback(
    (data: EventData) => {
      const { type, index, status, action } = data;

      // Tour finished or skipped. Do not use action === CLOSE here: in v3, close() also
      // advances steps (overlay / close button with closeButtonAction: 'close'), and
      // STEP_AFTER carries that action — treating CLOSE as "end tour" would kill the run
      // right after the first step.
      if (
        type === EVENTS.TOUR_END ||
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED
      ) {
        onPhaseEnd();
        return;
      }

      // Step completed — determine direction from action, then update stepIndex.
      // In v3 controlled mode the library never auto-advances the internal index.
      // Using action to detect PREV avoids going to index -1 (which triggers FINISHED).
      if (type === EVENTS.STEP_AFTER) {
        const isBack = action === ACTIONS.PREV;
        onStepChange(isBack ? Math.max(0, index - 1) : index + 1);
      }
    },
    [onPhaseEnd, onStepChange],
  );

  if (phase === 'none' || steps.length === 0) return null;

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
        // Don't trap keyboard focus inside the tooltip so the user can
        // continue using PDF shortcuts (arrows, +/-) while the tour is visible.
        disableFocusTrap: true,
      }}
      styles={{
        overlay: {
          mixBlendMode: 'normal',
        },
      }}
    />
  );
};
