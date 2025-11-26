"use client";

import { useFont, type FontType } from '@/contexts/FontContext';
import { Type } from 'lucide-react';

const fonts: Array<{ id: FontType; name: string; preview: string }> = [
  { id: 'audiowide', name: 'Audiowide', preview: 'Neural' },
  { id: 'orbitron', name: 'Orbitron', preview: 'Neural' },
  { id: 'special-elite', name: 'Special Elite', preview: 'Neural' },
  { id: 'barrio', name: 'Barrio', preview: 'Neural' },
  { id: 'default', name: 'Default', preview: 'Neural' },
];

const fontClasses: Record<FontType, string> = {
  'audiowide': 'font-[var(--font-audiowide)]',
  'orbitron': 'font-orbitron',
  'special-elite': 'font-[var(--font-special-elite)]',
  'barrio': 'font-[var(--font-barrio)]',
  'default': 'font-sans'
};

export function FontSelector() {
  const { currentFont, setFont } = useFont();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative group">
        {/* Trigger Button */}
        <button
          className="p-3 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          title="Change Font"
        >
          <Type className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          <div className="p-2">
            <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider px-2 py-1 mb-1">
              Choose Font Style
            </div>
            {fonts.map((font) => (
              <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md transition-all duration-150 flex items-center justify-between group/item ${
                  currentFont === font.id
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                    : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{font.name}</span>
                  <span className={`text-lg ${fontClasses[font.id]} mt-0.5`}>
                    {font.preview}
                  </span>
                </div>
                {currentFont === font.id && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

