import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

/**
 * Hook to handle keyboard shortcuts
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const metaMatch = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const shiftMatch = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

        // Check if we're in an input/textarea/contenteditable (don't trigger shortcuts)
        const target = event.target as HTMLElement;
        const isInput = 
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch && !isInput) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break; // Only trigger first matching shortcut
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};

