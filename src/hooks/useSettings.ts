import { useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings, type Settings } from '../state/settings';

/** Settings are reflected onto <html> as data-attributes so CSS tokens can respond. */
export function applySettingsToDocument(settings: Settings, root: HTMLElement = document.documentElement): void {
  if (settings.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
  root.toggleAttribute('data-high-contrast', settings.highContrast);
  root.toggleAttribute('data-comfort', settings.comfortSpacing);
  root.toggleAttribute('data-reduce-motion', settings.reduceMotion);
  root.style.setProperty('--text-scale', String(settings.textScale));
}

export function useSettings(): readonly [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  useEffect(() => {
    applySettingsToDocument(settings);
    saveSettings(settings);
  }, [settings]);
  const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);
  return [settings, update] as const;
}
