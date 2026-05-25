'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light' | 'colorful';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('stampomad-theme') as Theme | null;
    if (saved && ['dark', 'light', 'colorful'].includes(saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('stampomad-theme', t);
  }, []);

  // Prevent flash of wrong theme
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const THEMES: { id: Theme; label: string; icon: string; preview: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌙', preview: 'bg-[#0a0f1e]' },
  { id: 'light', label: 'Light', icon: '☀️', preview: 'bg-[#f5f3ef]' },
  { id: 'colorful', label: 'Colorful', icon: '🎨', preview: 'bg-[#0f0a1a]' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-1">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer border transition-all ${
            theme === t.id
              ? 'border-gold text-gold bg-gold/10'
              : 'border-white/[0.08] text-text-muted hover:text-text hover:border-white/20'
          }`}
          title={t.label}
        >
          <span>{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
