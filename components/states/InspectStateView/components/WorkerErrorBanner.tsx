"use client";

import { AlertTriangle } from "lucide-react";

interface WorkerErrorBannerProps {
  error: string;
  onRetry?: () => void;
}

export function WorkerErrorBanner({ error, onRetry }: WorkerErrorBannerProps) {
  return (
    <div className="mb-4 rounded-xl border border-red-500/40 bg-[oklch(28%_0.12_15_/_0.7)] p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-300 mb-0.5">Transcription worker failed to start</p>
        <p className="text-xs text-red-200/80">{error}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold py-1.5 px-3 rounded transition-colors whitespace-nowrap"
          >
            Retry
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-red-400/70 hover:text-red-300 transition-colors whitespace-nowrap"
          title="Ctrl+Shift+R for a hard refresh"
        >
          Hard refresh
        </button>
      </div>
    </div>
  );
}
