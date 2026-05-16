"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontType = 'audiowide' | 'orbitron' | 'special-elite' | 'barrio' | 'default';

interface FontContextType {
  currentFont: FontType;
  setFont: (font: FontType) => void;
  fontClass: string;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const fontClasses: Record<FontType, string> = {
  'audiowide': 'font-[var(--font-audiowide)]',
  'orbitron': 'font-orbitron',
  'special-elite': 'font-[var(--font-special-elite)]',
  'barrio': 'font-[var(--font-barrio)]',
  'default': 'font-sans'
};

export function FontProvider({ children }: { children: ReactNode }) {
  const [currentFont, setCurrentFont] = useState<FontType>('default');

  // Load font preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('neural-groove-font') as FontType;
    if (saved && fontClasses[saved]) {
      setCurrentFont(saved);
    }
  }, []);

  // Save font preference to localStorage
  const setFont = (font: FontType) => {
    setCurrentFont(font);
    localStorage.setItem('neural-groove-font', font);
  };

  const fontClass = fontClasses[currentFont];

  return (
    <FontContext.Provider value={{ currentFont, setFont, fontClass }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within FontProvider');
  }
  return context;
}


