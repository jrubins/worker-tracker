import { useCallback, useEffect, useState } from 'react';

/** Dark is the default; "system" follows the device's light/dark setting. */
export type ThemePreference = 'dark' | 'light' | 'system';

// The same key and default are read by the inline script in index.html, before first paint.
const STORAGE_KEY = 'theme';

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'dark' || value === 'light' || value === 'system';

export function readThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isPreference(stored) ? stored : 'dark';
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && systemDark().matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** The saved theme preference, and a setter that saves and applies it. */
export function useThemePreference() {
  const [preference, setPreference] = useState(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    const media = systemDark();
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const choose = useCallback((next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
  }, []);

  return [preference, choose] as const;
}
