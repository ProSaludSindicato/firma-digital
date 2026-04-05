import { useState, useCallback } from 'react';

export type TourPhase = 'welcome' | 'viewer' | 'modal' | 'placed' | 'none';

// Bumped to v2: 'signing' phase replaced by contextual 'modal' + 'placed' phases.
const STORAGE_KEY = 'fdd-tour-v2';
const ALL_PHASES: TourPhase[] = ['welcome', 'viewer', 'modal', 'placed'];

function loadShownPhases(): Set<TourPhase> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: TourPhase[] = raw ? JSON.parse(raw) : [];
    return new Set(arr.filter((p): p is TourPhase => ALL_PHASES.includes(p as TourPhase)));
  } catch {
    return new Set();
  }
}

function saveShownPhases(phases: Set<TourPhase>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...phases]));
  } catch { /* noop */ }
}

export interface UseTourReturn {
  run: boolean;
  stepIndex: number;
  currentPhase: TourPhase;
  setRun: React.Dispatch<React.SetStateAction<boolean>>;
  setStepIndex: React.Dispatch<React.SetStateAction<number>>;
  isPhaseShown: (phase: TourPhase) => boolean;
  startPhase: (phase: TourPhase) => void;
  endPhase: () => void;
}

export function useTour(): UseTourReturn {
  const [shownPhases, setShownPhases] = useState<Set<TourPhase>>(loadShownPhases);

  const [run, setRun] = useState<boolean>(() => !loadShownPhases().has('welcome'));
  const [stepIndex, setStepIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<TourPhase>(
    () => (loadShownPhases().has('welcome') ? 'none' : 'welcome'),
  );

  const isPhaseShown = useCallback(
    (phase: TourPhase) => shownPhases.has(phase),
    [shownPhases],
  );

  const startPhase = useCallback((phase: TourPhase) => {
    setCurrentPhase(phase);
    setStepIndex(0);
    setRun(true);
  }, []);

  const endPhase = useCallback(() => {
    setShownPhases((prev) => {
      const next = new Set(prev);
      if (currentPhase !== 'none') {
        next.add(currentPhase);
        saveShownPhases(next);
      }
      return next;
    });
    setRun(false);
    setCurrentPhase('none');
  }, [currentPhase]);

  return {
    run,
    stepIndex,
    currentPhase,
    setRun,
    setStepIndex,
    isPhaseShown,
    startPhase,
    endPhase,
  };
}
