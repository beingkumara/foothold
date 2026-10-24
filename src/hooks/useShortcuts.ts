import { useEffect, useRef } from 'react';

export type ShortcutMap = Readonly<Record<string, () => void>>;

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

/**
 * Single-key shortcuts. WCAG 2.1.4 requires these can be turned off,
 * so `enabled` is wired to a user setting. Never fires while typing or with modifiers.
 */
export function useShortcuts(map: ShortcutMap, enabled: boolean): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('dialog[open]')) return;
      const handler = mapRef.current[event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
