"use client";

import { useFont } from '@/contexts/FontContext';
import { Zap } from 'lucide-react';
import Image from 'next/image';

interface PageHeaderProps {
  subtitle: string;
  description?: string;
  icon?: React.ReactNode;
}

export function PageHeader({ subtitle, description, icon }: PageHeaderProps) {
  const { fontClass } = useFont();

  return (
    <div className="text-center mb-8">
      {/* Main Title - Logo Image */}
      <div className="mb-3 flex justify-center bg-zinc-950 p-4 rounded-lg">
        <Image
          src="/branding/NeuralGrooveLogoEnhanced.PNG"
          alt="Neural Groove Spectrum Divergent"
          width={500}
          height={200}
          priority
          className="max-w-full h-auto"
          style={{
            filter: 'brightness(1.1) saturate(0.5)',
          }}
        />
      </div>

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


