"use client";

import { useFont } from '@/contexts/FontContext';
import { Zap } from 'lucide-react';
import Image from 'next/image';

interface PageHeaderProps {
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  showLogo?: boolean;
}

export function PageHeader({ subtitle, description, icon, showLogo = true }: PageHeaderProps) {
  const { fontClass } = useFont();

  return (
    <div className="text-center mb-8">
      {/* Main Title - Logo Image with seamless background blend */}
      {showLogo && (
        <div className="mb-3 flex justify-center relative">
          <Image
            src="/branding/NeuralGrooveLogoEnhanced.PNG"
            alt="Neural Groove Spectrum Divergent"
            width={550}
            height={220}
            priority
            className="max-w-full h-auto"
            style={{
              maskImage: 'radial-gradient(ellipse 70% 70% at center, black 30%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 30%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* Divider - only show if there's a subtitle */}
      {subtitle && (
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          <Zap className="w-4 h-4 text-blue-400" />
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
        </div>
      )}

      {/* Subtitle - Current Page/Feature */}
      {subtitle && (
        <div className="flex items-center justify-center gap-3">
          {icon && (
            <div className="text-2xl">{icon}</div>
          )}
          <h2 className={`text-2xl sm:text-3xl font-bold text-zinc-200 ${fontClass}`}>
            {subtitle}
          </h2>
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-zinc-400 mt-3 max-w-2xl mx-auto">
          {description}
        </p>
      )}

      {/* Animated underline - only show if there's a subtitle */}
      {subtitle && (
        <div className="mt-4 h-1 w-32 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-50"></div>
      )}
    </div>
  );
}


