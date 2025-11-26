"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Zap } from "lucide-react";
import { cn } from "@/utils/cn";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";

/**
 * Processing Visualizer Component
 * 
 * Shows animated feedback during conversion/extraction:
 * - Circular progress ring
 * - Pulsing animation based on processing speed
 * - Phase indicators
 * - Cancellation button
 * - Breadcrumbs and page header for navigation context
 */

export type ProcessingPhase = "initializing" | "processing" | "finalizing";

interface ProcessingVisualizerProps {
  progress: number; // 0-100
  speed: number | null; // Processing speed (e.g., 1.5x)
  phase: ProcessingPhase;
  formatName?: string; // e.g., "MP3", "WAV"
  onCancel?: () => void;
  onNavigate?: () => void; // For breadcrumbs navigation
  className?: string;
}

export function ProcessingVisualizer({
  progress,
  speed,
  phase,
  formatName,
  onCancel,
  onNavigate,
  className,
}: ProcessingVisualizerProps) {
  const [pulseSpeed, setPulseSpeed] = useState(1);

  // Adjust pulse animation speed based on processing speed
  useEffect(() => {
    if (speed && speed > 0) {
      // Higher speed = faster pulse
      setPulseSpeed(Math.min(Math.max(speed, 0.5), 3));
    }
  }, [speed]);

  const phaseText = {
    initializing: formatName === "AI" ? "Loading AI Model..." : "Initializing...",
    processing: formatName === "AI" ? "Preparing Audio..." : formatName ? `Converting to ${formatName}` : "Processing",
    finalizing: formatName === "AI" ? "Transcribing with AI..." : "Finalizing...",
  };

  const phaseColor = {
    initializing: "text-yellow-400",
    processing: "text-blue-400",
    finalizing: "text-purple-400",
  };

  // Circular progress calculation
  const circumference = 2 * Math.PI * 70; // radius = 70
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/90 backdrop-blur-sm z-50",
        className
      )}
    >
      {/* Breadcrumbs and Header at the top */}
      <div className="container mx-auto px-4 pt-8 max-w-6xl">
        <Breadcrumbs 
          currentState="PROCESSING" 
          onNavigate={onNavigate || (() => {})}
        />
        <PageHeader 
          mainTitle="Neural Groove Spectrum Divergent"
          subtitle="Processing Your File"
        />
      </div>

      {/* Processing visualizer centered */}
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="max-w-md w-full mx-4">
        {/* Main Card */}
        <div className="bg-zinc-900 border-2 border-blue-500/50 rounded-xl p-8 shadow-2xl">
          {/* Circular Progress */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-zinc-800"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="text-blue-500 transition-all duration-300 ease-out"
                strokeLinecap="round"
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Pulsing icon */}
              <div
                className="mb-2"
                style={{
                  animation: `pulse ${1 / pulseSpeed}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                }}
              >
                <Zap className="w-12 h-12 text-blue-400" />
              </div>

              {/* Progress percentage */}
              <div className="text-3xl font-black text-zinc-100">
                {Math.round(progress)}%
              </div>

              {/* Speed indicator */}
              {speed !== null && speed > 0 && (
                <div className="text-xs text-cyan-400 font-mono mt-1">
                  {speed.toFixed(1)}x speed
                </div>
              )}
            </div>
          </div>

          {/* Phase text */}
          <div className="text-center mb-6">
            <h3 className={cn("text-xl font-bold mb-2", phaseColor[phase])}>
              {phaseText[phase]}
            </h3>
            <p className="text-sm text-zinc-400">
              {formatName === "AI" ? (
                <>
                  {phase === "initializing" && "Downloading Whisper model (42MB, one-time only)..."}
                  {phase === "processing" && "Converting audio to 16kHz mono for AI..."}
                  {phase === "finalizing" && "Running speech recognition..."}
                </>
              ) : (
                <>
                  {phase === "initializing" && "Loading FFmpeg engine..."}
                  {phase === "processing" && "This may take a moment depending on file size"}
                  {phase === "finalizing" && "Almost done..."}
                </>
              )}
            </p>
          </div>

          {/* Progress bar (linear fallback) */}
          <div className="mb-6">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Cancel button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel Processing
            </button>
          )}

          {/* Warning hint */}
          <p className="mt-4 text-xs text-center text-zinc-600">
            {onCancel
              ? "You can cancel at any time. Processed data will not be saved."
              : "Please wait while we process your file..."}
          </p>
        </div>

        {/* Animated background glow */}
        <div
          className="absolute inset-0 -z-10 blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, rgb(59, 130, 246), transparent 70%)`,
            animation: `pulse ${2 / pulseSpeed}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
          }}
        />
      </div>
      </div>
    </div>
  );
}

