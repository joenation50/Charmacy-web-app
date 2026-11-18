import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
const THEME_KEY = 'cm-theme';

function getInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  const applyTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    const root = document.documentElement;
    root.setAttribute('data-theme', next);
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(new CustomEvent('cm-themechange', { detail: { theme: next } }));
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  return { theme, setTheme: applyTheme, toggleTheme };
}
