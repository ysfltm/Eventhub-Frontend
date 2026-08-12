import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ThemeContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages dark / light mode preference.
 * - Persists to localStorage under key 'cst_theme'
 * - Respects prefers-color-scheme on first visit
 * - Applies data-theme="light" | "dark" to <html> element
 */

const STORAGE_KEY = 'cst_theme';

export const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // 1. Respect user's saved preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // 2. Fall back to OS preference
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  });

  /* Apply data-theme attribute to <html> on every change */
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** Convenience hook */
export const useTheme = () => useContext(ThemeContext);
