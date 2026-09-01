import { useCallback, useMemo, useState } from 'react';

const LEGACY_STORAGE_KEY = 'fdd-editor-tour-v1';

export const EDITOR_TOUR_MAX_AUTO_SHOWS = 3;

export type EditorTourScope = 'standalone' | 'embed';

function countStorageKey(scope: EditorTourScope): string {
  return scope === 'embed' ? 'fdd-editor-tour-embed-v2' : 'fdd-editor-tour-v2';
}

function contextsStorageKey(scope: EditorTourScope): string {
  return `${countStorageKey(scope)}-contexts`;
}

function loadLegacyShowCount(scope: EditorTourScope): number {
  try {
    const raw = localStorage.getItem(countStorageKey(scope));
    if (raw === null) {
      return 0;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function loadCompletedContexts(scope: EditorTourScope): string[] {
  try {
    const raw = localStorage.getItem(contextsStorageKey(scope));
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string').slice(0, EDITOR_TOUR_MAX_AUTO_SHOWS);
      }
    }

    if (scope === 'standalone' && localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem(countStorageKey(scope), String(EDITOR_TOUR_MAX_AUTO_SHOWS));
      return Array.from({ length: EDITOR_TOUR_MAX_AUTO_SHOWS }, (_, index) => `legacy-${index}`);
    }

    const legacyCount = loadLegacyShowCount(scope);
    if (legacyCount >= EDITOR_TOUR_MAX_AUTO_SHOWS) {
      return Array.from({ length: EDITOR_TOUR_MAX_AUTO_SHOWS }, (_, index) => `legacy-${index}`);
    }

    return [];
  } catch {
    return [];
  }
}

function saveCompletedContexts(scope: EditorTourScope, contexts: string[]): string[] {
  const normalized = contexts.slice(0, EDITOR_TOUR_MAX_AUTO_SHOWS);

  try {
    localStorage.setItem(contextsStorageKey(scope), JSON.stringify(normalized));
    localStorage.setItem(countStorageKey(scope), String(normalized.length));
  } catch {
    /* noop */
  }

  return normalized;
}

function markContextCompleted(scope: EditorTourScope, contextId: string): string[] {
  const existing = loadCompletedContexts(scope);

  if (existing.includes(contextId)) {
    return existing;
  }

  return saveCompletedContexts(scope, [...existing, contextId]);
}

export function canAutoStartTour(scope: EditorTourScope, contextId: string): boolean {
  if (!contextId) {
    return false;
  }

  const completed = loadCompletedContexts(scope);

  if (completed.length >= EDITOR_TOUR_MAX_AUTO_SHOWS) {
    return false;
  }

  return !completed.includes(contextId);
}

export interface UseEditorTourReturn {
  run: boolean;
  stepIndex: number;
  setStepIndex: React.Dispatch<React.SetStateAction<number>>;
  /** True when the tour should no longer auto-start (shown on max distinct contexts). */
  hasBeenShown: boolean;
  showCount: number;
  maxAutoShows: number;
  canAutoStart: (contextId: string) => boolean;
  start: () => void;
  end: (contextId?: string) => void;
}

export function useEditorTour(scope: EditorTourScope = 'standalone'): UseEditorTourReturn {
  const initialContexts = useMemo(() => loadCompletedContexts(scope), [scope]);
  const [completedContexts, setCompletedContexts] = useState(initialContexts);
  const [hasBeenShown, setHasBeenShown] = useState(
    () => initialContexts.length >= EDITOR_TOUR_MAX_AUTO_SHOWS,
  );
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const canAutoStart = useCallback(
    (contextId: string) => {
      if (!contextId) {
        return false;
      }

      if (completedContexts.length >= EDITOR_TOUR_MAX_AUTO_SHOWS) {
        return false;
      }

      return !completedContexts.includes(contextId);
    },
    [completedContexts],
  );

  const start = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const end = useCallback(
    (contextId?: string) => {
      if (contextId) {
        const nextContexts = markContextCompleted(scope, contextId);
        setCompletedContexts(nextContexts);
        setHasBeenShown(nextContexts.length >= EDITOR_TOUR_MAX_AUTO_SHOWS);
      }

      setRun(false);
      setStepIndex(0);
    },
    [scope],
  );

  return {
    run,
    stepIndex,
    setStepIndex,
    hasBeenShown,
    showCount: completedContexts.length,
    maxAutoShows: EDITOR_TOUR_MAX_AUTO_SHOWS,
    canAutoStart,
    start,
    end,
  };
}
