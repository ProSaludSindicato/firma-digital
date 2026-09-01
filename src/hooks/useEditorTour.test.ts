import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  canAutoStartTour,
  EDITOR_TOUR_MAX_AUTO_SHOWS,
  useEditorTour,
} from './useEditorTour';

describe('useEditorTour', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('counts completed tours per distinct context, not repeated closes on the same one', () => {
    const { result } = renderHook(() => useEditorTour('embed'));

    expect(canAutoStartTour('embed', 'process-a:acta')).toBe(true);

    act(() => {
      result.current.end('process-a:acta');
    });

    expect(result.current.showCount).toBe(1);
    expect(result.current.hasBeenShown).toBe(false);
    expect(canAutoStartTour('embed', 'process-a:acta')).toBe(false);
    expect(canAutoStartTour('embed', 'process-a:consentimiento')).toBe(true);

    act(() => {
      result.current.end('process-a:acta');
    });
    expect(result.current.showCount).toBe(1);

    act(() => {
      result.current.end('process-b:formato');
    });
    act(() => {
      result.current.end('process-c:formato');
    });

    expect(result.current.showCount).toBe(3);
    expect(result.current.hasBeenShown).toBe(true);
    expect(canAutoStartTour('embed', 'process-d:formato')).toBe(false);
  });

  it('keeps a separate counter for embed mode', () => {
    const standalone = renderHook(() => useEditorTour('standalone'));
    act(() => {
      standalone.result.current.end('doc-1');
      standalone.result.current.end('doc-2');
      standalone.result.current.end('doc-3');
    });
    expect(standalone.result.current.hasBeenShown).toBe(true);

    const embed = renderHook(() => useEditorTour('embed'));
    expect(embed.result.current.hasBeenShown).toBe(false);
    expect(canAutoStartTour('embed', 'process-a:acta')).toBe(true);
  });

  it('migrates the legacy single-show flag as fully exhausted', () => {
    localStorage.setItem('fdd-editor-tour-v1', 'true');

    const { result } = renderHook(() => useEditorTour('standalone'));

    expect(result.current.hasBeenShown).toBe(true);
    expect(result.current.showCount).toBe(EDITOR_TOUR_MAX_AUTO_SHOWS);
    expect(localStorage.getItem('fdd-editor-tour-v1')).toBeNull();
  });
});
