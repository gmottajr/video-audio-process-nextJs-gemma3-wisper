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
          <div className="h-px w-16 animate-line-glow opacity-80" />
          <Zap className="w-4 h-4 text-[oklch(74%_0.16_290)] animate-subtle-float" aria-hidden />
          <div className="h-px w-16 animate-line-glow opacity-80 [animation-delay:-2.5s]" />
        </div>
      )}

      {/* Subtitle - Current Page/Feature */}
      {subtitle && (
        <div className="flex items-center justify-center gap-3">
          {icon && (
            <div className="text-2xl">{icon}</div>
          )}
          <h2 className={`font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 ${fontClass}`}>
            {subtitle}
          </h2>
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-zinc-400 mt-3 max-w-2xl mx-auto text-[15px] leading-relaxed">
          {description}
        </p>
      )}

      {/* Animated underline - only show if there's a subtitle */}
      {subtitle && (
        <div className="mt-4 h-0.5 w-28 mx-auto rounded-full animate-line-glow" />
      )}
    </div>
  );
}


