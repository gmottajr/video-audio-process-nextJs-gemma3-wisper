"use client";

import { useEffect, useState } from "react";
import { Brain, Download, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * AI Loading Indicator Component
 * 
 * Shows a floating indicator when the AI model is loading in the background.
 * Displays download progress with percentage and status messages.
 */

interface AILoadingIndicatorProps {
  isLoading: boolean;
  isLoaded: boolean;
  progress: number; // 0-100
  message?: string;
  className?: string;
}

export function AILoadingIndicator({
  isLoading,
  isLoaded,
  progress,
  message,
  className,
}: AILoadingIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Show indicator when loading or just completed
  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setIsExpanded(true);
    } else if (isLoaded) {
      // Keep visible for 3 seconds after completion
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setTimeout(() => setIsVisible(false), 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isLoaded]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-40 transition-all duration-300",
        isExpanded ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        className
      )}
    >
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 border-2 border-purple-500/50 rounded-xl shadow-2xl overflow-hidden max-w-sm">
        {/* Header */}
        <div className="px-4 py-3 bg-black/30 flex items-center gap-3">
          <div className="relative">
            {isLoading ? (
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white animate-pulse" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            )}
            {isLoading && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading AI Model
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  AI Model Ready
                </>
              )}
            </h4>
            <p className="text-xs text-purple-200">
              {isLoading ? "Downloading Whisper..." : "Transcription enabled"}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-purple-200 hover:text-white transition-colors"
            aria-label="Minimize"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Section */}
        {isLoading && (
          <div className="px-4 py-3 space-y-3">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-200 font-medium">
                  {message || "Loading model files..."}
                </span>
                <span className="text-white font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-purple-950/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 transition-all duration-300 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 text-xs text-purple-200 bg-black/20 rounded-lg px-3 py-2">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span>
                {progress < 50 
                  ? "Downloading model (42MB, one-time only)..."
                  : progress < 95
                  ? "Almost ready..."
                  : "Finalizing..."}
              </span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!isLoading && isLoaded && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-green-200 bg-green-950/50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>AI transcription is now available!</span>
            </div>
          </div>
        )}
      </div>

      {/* Animated glow effect */}
      {isLoading && (
        <div
          className="absolute inset-0 -z-10 blur-2xl opacity-50"
          style={{
            background: "radial-gradient(circle at center, rgb(168, 85, 247), transparent 70%)",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      )}
    </div>
  );
}

