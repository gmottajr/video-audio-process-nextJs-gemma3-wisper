"use client";

/**
 * Enhancement Progress Component
 * 
 * Full-screen overlay showing AI enhancement progress.
 * Displays download, loading, and processing stages.
 */

import { useEffect, useState } from "react";
import { Download, Loader2, Sparkles, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { EnhancementProgress as EnhancementProgressType, EnhancementStage } from "@/types/enhancement";

interface EnhancementProgressProps {
  progress: EnhancementProgressType;
  onCancel?: () => void;
  modelSize?: string;
}

export function EnhancementProgress({ 
  progress, 
  onCancel,
  modelSize = "~1.7GB" 
}: EnhancementProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset elapsed time when stage changes
  useEffect(() => {
    setElapsedTime(0);
  }, [progress.stage]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStageConfig = (stage: EnhancementStage) => {
    switch (stage) {
      case 'downloading':
        return {
          icon: <Download className="w-8 h-8" />,
          title: 'Downloading AI Model',
          subtitle: `${modelSize} - This is a one-time download`,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30',
          gradientFrom: 'from-blue-600',
          gradientTo: 'to-cyan-600',
        };
      case 'loading':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin" />,
          title: 'Loading AI Model',
          subtitle: 'Initializing neural network...',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-500/30',
          gradientFrom: 'from-purple-600',
          gradientTo: 'to-pink-600',
        };
      case 'processing':
      case 'streaming':
        return {
          icon: <Sparkles className="w-8 h-8 animate-pulse" />,
          title: 'Enhancing Transcript',
          subtitle: progress.tokensGenerated 
            ? `Generated ${progress.tokensGenerated} tokens` 
            : 'AI is cleaning up your transcript...',
          color: 'text-pink-400',
          bgColor: 'bg-pink-500/20',
          borderColor: 'border-pink-500/30',
          gradientFrom: 'from-pink-600',
          gradientTo: 'to-orange-600',
        };
      case 'complete':
        return {
          icon: <CheckCircle className="w-8 h-8" />,
          title: 'Enhancement Complete',
          subtitle: 'Your transcript has been improved!',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          gradientFrom: 'from-green-600',
          gradientTo: 'to-emerald-600',
        };
      case 'error':
        return {
          icon: <XCircle className="w-8 h-8" />,
          title: 'Enhancement Failed',
          subtitle: progress.message || 'An error occurred',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          gradientFrom: 'from-red-600',
          gradientTo: 'to-orange-600',
        };
      case 'cancelled':
        return {
          icon: <AlertTriangle className="w-8 h-8" />,
          title: 'Enhancement Cancelled',
          subtitle: 'The operation was cancelled',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          gradientFrom: 'from-yellow-600',
          gradientTo: 'to-orange-600',
        };
      default:
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin" />,
          title: 'Processing',
          subtitle: progress.message || 'Please wait...',
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-500/20',
          borderColor: 'border-zinc-500/30',
          gradientFrom: 'from-zinc-600',
          gradientTo: 'to-zinc-700',
        };
    }
  };

  const config = getStageConfig(progress.stage);
  const canCancel = ['downloading', 'loading', 'processing', 'streaming'].includes(progress.stage);
  const isTerminal = ['complete', 'error', 'cancelled'].includes(progress.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md mx-4">
        {/* Main Card */}
        <div className={`
          bg-zinc-900 border ${config.borderColor} rounded-2xl overflow-hidden
          shadow-2xl shadow-purple-500/10
        `}>
          {/* Header */}
          <div className={`p-6 ${config.bgColor} flex flex-col items-center text-center`}>
            <div className={`p-4 rounded-2xl ${config.bgColor} ${config.color} mb-4`}>
              {config.icon}
            </div>
            <h2 className={`text-xl font-bold ${config.color}`}>
              {config.title}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {config.subtitle}
            </p>
          </div>

          {/* Progress Section */}
          <div className="p-6 space-y-4">
            {/* Progress Bar */}
            {!isTerminal && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{progress.message}</span>
                  <span className="text-zinc-300 font-medium">{progress.progress}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Download Info */}
            {progress.stage === 'downloading' && progress.downloadedMB !== undefined && (
              <div className="flex justify-between text-sm text-zinc-400 pt-2">
                <span>Downloaded</span>
                <span className="text-zinc-300">
                  {progress.downloadedMB} MB
                  {progress.totalMB && ` / ${progress.totalMB} MB`}
                </span>
              </div>
            )}

            {/* Elapsed Time */}
            {!isTerminal && (
              <div className="flex justify-between text-sm text-zinc-400 pt-2 border-t border-zinc-800">
                <span>Elapsed Time</span>
                <span className="text-zinc-300 font-mono">{formatTime(elapsedTime)}</span>
              </div>
            )}

            {/* Tips for downloading */}
            {progress.stage === 'downloading' && (
              <div className="mt-4 p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300 flex items-start gap-2">
                  <span className="text-blue-400 flex-shrink-0">💡</span>
                  <span>
                    This is a one-time download. The AI model will be cached in your browser for instant loading next time.
                  </span>
                </p>
              </div>
            )}

            {/* Tips for processing */}
            {(progress.stage === 'processing' || progress.stage === 'streaming') && (
              <div className="mt-4 p-3 bg-purple-950/30 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-300 flex items-start gap-2">
                  <span className="text-purple-400 flex-shrink-0">🤖</span>
                  <span>
                    The AI is analyzing your transcript and generating improvements. This may take a minute for longer texts.
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {canCancel && onCancel && (
            <div className="px-6 pb-6">
              <button
                onClick={onCancel}
                className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Background Animation */}
        {!isTerminal && (
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[600px] h-[600px] rounded-full opacity-20 blur-3xl
              bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}
              animate-pulse
            `} />
          </div>
        )}
      </div>
    </div>
  );
}



