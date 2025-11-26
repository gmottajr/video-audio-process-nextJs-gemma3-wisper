"use client";

import { useFont } from '@/contexts/FontContext';
import { Zap } from 'lucide-react';

interface PageHeaderProps {
  subtitle: string;
  description?: string;
  icon?: React.ReactNode;
}

export function PageHeader({ subtitle, description, icon }: PageHeaderProps) {
  const { fontClass } = useFont();

  return (
    <div className="text-center mb-8">
      {/* Main Title - Always Present */}
      <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black mb-3 ${fontClass}`}>
        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
          Neural Groove
        </span>
        <br />
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
          Spectrum Divergent
        </span>
      </h1>

      {/* Divider */}
      <div className="flex items-center justify-center gap-3 my-4">
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
        <Zap className="w-4 h-4 text-blue-400" />
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
      </div>

      {/* Subtitle - Current Page/Feature */}
      <div className="flex items-center justify-center gap-3">
        {icon && (
          <div className="text-2xl">{icon}</div>
        )}
        <h2 className={`text-2xl sm:text-3xl font-bold text-zinc-200 ${fontClass}`}>
          {subtitle}
        </h2>
      </div>

      {/* Description */}
      {description && (
        <p className="text-zinc-400 mt-3 max-w-2xl mx-auto">
          {description}
        </p>
      )}

      {/* Animated underline */}
      <div className="mt-4 h-1 w-32 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-50"></div>
    </div>
  );
}

