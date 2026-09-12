'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
}

const THEME_KEY = 'dynamicbudget_theme';

function readStoredTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return t;
}

function applyClass(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers read from localStorage once on first render (client only)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return readStoredTheme();
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return resolveTheme(readStoredTheme());
  });

  const applyTheme = useCallback((t: Theme) => {
    const resolved = resolveTheme(t);
    setResolvedTheme(resolved);
    applyClass(resolved);
  }, []);

  // Apply the initial theme class on mount (DOM manipulation only)
  useEffect(() => {
    applyClass(resolvedTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // Listen for OS colour-scheme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Re-read current preference from storage so handler is never stale
      if (readStoredTheme() === 'system') {
        const resolved = resolveTheme('system');
        setResolvedTheme(resolved);
        applyClass(resolved);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // localStorage blocked (e.g., private-browsing restrictions) — ignore
    }
    applyTheme(t);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** A compact dark/light/system toggle button for the header. */
export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const icons: Record<Theme, string> = { light: '☀️', dark: '🌙', system: '💻' };
  const labels: Record<Theme, string> = { light: 'Light mode', dark: 'Dark mode', system: 'System theme' };

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${labels[theme]} — click to cycle`}
      aria-label={labels[theme]}
      className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all"
    >
      {icons[theme]}
    </button>
  );
}
