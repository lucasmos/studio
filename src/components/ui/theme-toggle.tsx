'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  // Initialize state to undefined to prevent hydration mismatch, will be set in useEffect
  const [theme, setTheme] = useState<'light' | 'dark' | undefined>(undefined);

  useEffect(() => {
    const applyThemePreference = (chosenTheme: 'light' | 'dark') => {
      if (chosenTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', chosenTheme);
      setTheme(chosenTheme);
    };

    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      applyThemePreference(storedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyThemePreference(prefersDark ? 'dark' : 'light');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if no theme is explicitly set by user in localStorage
      if (!localStorage.getItem('theme')) {
        applyThemePreference(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    if (theme) { // Ensure theme is initialized
      const newTheme = theme === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', newTheme);
      setTheme(newTheme);
    }
  };
  
  // Prevent rendering button until theme is determined to avoid hydration errors
  if (theme === undefined) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled><Sun className="h-5 w-5" /></Button>; 
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
