import { useCallback, useState } from 'react';

const STORAGE_KEY = 'fdd-editor-tour-v1';

function loadHasBeenShown(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveHasBeenShown(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* noop */
  }
}

export interface UseEditorTourReturn {
  run: boolean;
  stepIndex: number;
  setStepIndex: React.Dispatch<React.SetStateAction<number>>;
  hasBeenShown: boolean;
  start: () => void;
  end: () => void;
}

export function useEditorTour(): UseEditorTourReturn {
  const [hasBeenShown, setHasBeenShown] = useState(loadHasBeenShown);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const end = useCallback(() => {
    saveHasBeenShown();
    setHasBeenShown(true);
    setRun(false);
    setStepIndex(0);
  }, []);

  return {
    run,
    stepIndex,
    setStepIndex,
    hasBeenShown,
    start,
    end,
  };
}
